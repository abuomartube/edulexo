import { Router, type IRouter, type Request, type Response } from "express";
import { Readable } from "stream";
import { z } from "zod";
import { db, uploadGrantsTable } from "@workspace/db";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "../lib/objectStorage";
import { ObjectPermission } from "../lib/objectAcl";
import { requireAuth, getUserById } from "../lib/auth";

const router: IRouter = Router();
const objectStorageService = new ObjectStorageService();

const RequestUploadUrlBody = z.object({
  name: z.string().min(1).max(256),
  size: z.number().int().nonnegative().max(20 * 1024 * 1024), // 20 MB cap
  contentType: z.string().min(1).max(128),
});

// NOTE (defense-in-depth, deferred): the `size` field above is checked
// server-side, but the presigned PUT URL itself does NOT carry a
// content-length constraint, so a determined attacker could PUT a much
// larger blob than they declared. The downside is bucket-cost abuse, not
// auth bypass. If this becomes a problem, switch `signObjectURL` to
// emit conditions like x-goog-content-length-range and verify after upload.

/**
 * POST /storage/uploads/request-url
 *
 * Request a presigned URL for file upload. The client sends JSON metadata
 * (name, size, contentType) — NOT the file. The browser then uploads the
 * file directly to the returned presigned URL via PUT.
 *
 * Auth: any logged-in user. The `objectPath` returned is owned by the
 * uploader and locked down by ACL on first use (see checkout route).
 */
router.post(
  "/storage/uploads/request-url",
  requireAuth,
  async (req: Request, res: Response) => {
    const parsed = RequestUploadUrlBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_body" });
      return;
    }

    try {
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      const objectPath =
        objectStorageService.normalizeObjectEntityPath(uploadURL);

      // Bind the issued path to the requesting user. Anything that later
      // attaches this object (e.g. POST /api/checkout/bank-transfer) must
      // verify ownership against this row to prevent IDOR. Grants live for
      // 1 hour — well past the presigned URL's 15-minute TTL but short
      // enough that abandoned uploads age out.
      const userId = req.session.userId!;
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
      await db
        .insert(uploadGrantsTable)
        .values({ objectPath, userId, expiresAt });

      res.json({ uploadURL, objectPath });
    } catch (error) {
      req.log.error({ err: error }, "Error generating upload URL");
      res.status(500).json({ error: "upload_url_failed" });
    }
  },
);

/**
 * GET /storage/objects/*
 *
 * Serve uploaded objects (e.g. bank-transfer payment proofs). Protected:
 * the object's ACL determines whether the viewer is allowed. Admins always
 * pass via `isAdmin` check on the request user.
 */
router.get(
  "/storage/objects/*path",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const raw = req.params.path;
      const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
      const objectPath = `/objects/${wildcardPath}`;
      const objectFile =
        await objectStorageService.getObjectEntityFile(objectPath);

      const userId = req.session.userId;
      const user = userId ? await getUserById(userId) : undefined;
      const isAdmin = user?.role === "admin";
      if (!isAdmin) {
        const canAccess = await objectStorageService.canAccessObjectEntity({
          userId,
          objectFile,
          requestedPermission: ObjectPermission.READ,
        });
        if (!canAccess) {
          res.status(403).json({ error: "forbidden" });
          return;
        }
      }

      const response = await objectStorageService.downloadObject(objectFile);
      res.status(response.status);
      response.headers.forEach((value, key) => res.setHeader(key, value));
      if (response.body) {
        const nodeStream = Readable.fromWeb(
          response.body as ReadableStream<Uint8Array>,
        );
        nodeStream.pipe(res);
      } else {
        res.end();
      }
    } catch (error) {
      if (error instanceof ObjectNotFoundError) {
        res.status(404).json({ error: "not_found" });
        return;
      }
      req.log.error({ err: error }, "Error serving object");
      res.status(500).json({ error: "serve_failed" });
    }
  },
);

export default router;

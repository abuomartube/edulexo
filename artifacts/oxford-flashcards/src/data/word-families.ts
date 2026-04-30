import type { CEFRLevel } from "@/data/oxford-words";

  export interface WordFamily {
    id: string;
    icon: string;
    title: string;
    titleAr: string;
    color: string;
    words: string[];
  }

  export const wordFamilies: WordFamily[] = [
    {
      id: "family",
      icon: "Users",
      title: "Family & Relationships",
      titleAr: "العائلة والعلاقات",
      color: "from-rose-400 to-pink-500",
      words: ["mother", "father", "sister", "brother", "son", "daughter", "aunt", "uncle", "cousin", "parent"],
    },
  {
      id: "body",
      icon: "PersonStanding",
      title: "Body Parts",
      titleAr: "أجزاء الجسم",
      color: "from-orange-400 to-red-500",
      words: ["head", "eye", "ear", "nose", "mouth", "hand", "foot", "arm", "leg", "hair"],
    },
  {
      id: "food",
      icon: "UtensilsCrossed",
      title: "Food & Meals",
      titleAr: "الطعام والوجبات",
      color: "from-amber-400 to-orange-500",
      words: ["bread", "cheese", "butter", "egg", "meat", "fish", "rice", "soup", "salad", "sandwich"],
    },
  {
      id: "fruit",
      icon: "Apple",
      title: "Fruits & Sweets",
      titleAr: "الفاكهة والحلويات",
      color: "from-red-400 to-rose-500",
      words: ["apple", "banana", "orange", "lemon", "fruit", "juice", "jam", "sugar", "sweet", "chocolate"],
    },
  {
      id: "vegetables",
      icon: "Carrot",
      title: "Vegetables & Cooking",
      titleAr: "الخضروات والطبخ",
      color: "from-lime-400 to-green-500",
      words: ["carrot", "potato", "tomato", "onion", "pepper", "bean", "vegetable", "cooking", "cook", "oil"],
    },
  {
      id: "animals",
      icon: "PawPrint",
      title: "Animals",
      titleAr: "الحيوانات",
      color: "from-yellow-400 to-amber-500",
      words: ["cat", "dog", "bird", "horse", "cow", "sheep", "pig", "mouse", "elephant", "bear"],
    },
  {
      id: "colors",
      icon: "Palette",
      title: "Colours",
      titleAr: "الألوان",
      color: "from-fuchsia-400 to-purple-500",
      words: ["red", "blue", "green", "yellow", "black", "white", "brown", "pink", "orange", "grey"],
    },
  {
      id: "numbers",
      icon: "Hash",
      title: "Numbers",
      titleAr: "الأرقام",
      color: "from-blue-400 to-indigo-500",
      words: ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"],
    },
  {
      id: "time_day",
      icon: "Clock",
      title: "Time of Day",
      titleAr: "أوقات اليوم",
      color: "from-indigo-400 to-violet-500",
      words: ["day", "night", "morning", "afternoon", "evening", "week", "month", "year", "hour", "minute"],
    },
  {
      id: "weather",
      icon: "Cloud",
      title: "Weather",
      titleAr: "الطقس",
      color: "from-sky-400 to-blue-500",
      words: ["rain", "snow", "sun", "wind", "cloud", "storm", "hot", "cold", "warm", "ice"],
    },
  {
      id: "clothes",
      icon: "Shirt",
      title: "Clothes",
      titleAr: "الملابس",
      color: "from-pink-400 to-rose-500",
      words: ["shirt", "dress", "coat", "hat", "shoe", "sock", "jacket", "suit", "jeans", "skirt"],
    },
  {
      id: "house",
      icon: "Home",
      title: "House & Rooms",
      titleAr: "المنزل والغرف",
      color: "from-emerald-400 to-teal-500",
      words: ["house", "room", "kitchen", "bedroom", "bathroom", "garden", "door", "window", "wall", "floor"],
    },
  {
      id: "furniture",
      icon: "Armchair",
      title: "Furniture & Appliances",
      titleAr: "الأثاث والأجهزة",
      color: "from-amber-500 to-yellow-600",
      words: ["chair", "table", "bed", "desk", "lamp", "mirror", "shelf", "cupboard", "fridge", "clock"],
    },
  {
      id: "transport",
      icon: "Car",
      title: "Transport",
      titleAr: "وسائل النقل",
      color: "from-cyan-400 to-sky-500",
      words: ["car", "bus", "train", "plane", "bike", "boat", "taxi", "ship", "truck", "lorry"],
    },
  {
      id: "school",
      icon: "GraduationCap",
      title: "School & Study",
      titleAr: "المدرسة والدراسة",
      color: "from-violet-400 to-purple-500",
      words: ["school", "teacher", "student", "class", "lesson", "book", "pen", "pencil", "exam", "homework"],
    },
  {
      id: "jobs",
      icon: "Briefcase",
      title: "Jobs",
      titleAr: "المهن",
      color: "from-slate-400 to-gray-600",
      words: ["doctor", "nurse", "teacher", "lawyer", "engineer", "manager", "artist", "writer", "chef", "farmer"],
    },
  {
      id: "sports",
      icon: "Trophy",
      title: "Sports & Activities",
      titleAr: "الرياضة والأنشطة",
      color: "from-green-400 to-emerald-500",
      words: ["football", "tennis", "basketball", "swim", "run", "ride", "jump", "throw", "catch", "kick"],
    },
  {
      id: "music",
      icon: "Music",
      title: "Music",
      titleAr: "الموسيقى",
      color: "from-purple-400 to-fuchsia-500",
      words: ["music", "song", "sing", "dance", "band", "guitar", "piano", "concert", "album", "drum"],
    },
  {
      id: "nature",
      icon: "Trees",
      title: "Nature",
      titleAr: "الطبيعة",
      color: "from-teal-400 to-green-500",
      words: ["tree", "flower", "grass", "river", "sea", "mountain", "forest", "hill", "lake", "beach"],
    },
  {
      id: "city",
      icon: "Building2",
      title: "City & Places",
      titleAr: "المدينة والأماكن",
      color: "from-stone-400 to-zinc-600",
      words: ["city", "town", "village", "road", "street", "building", "park", "shop", "station", "square"],
    },
  {
      id: "emotions",
      icon: "Smile",
      title: "Feelings & Emotions",
      titleAr: "المشاعر والعواطف",
      color: "from-yellow-400 to-orange-400",
      words: ["happy", "sad", "angry", "afraid", "excited", "surprised", "bored", "tired", "worried", "calm"],
    },
  {
      id: "movement",
      icon: "Footprints",
      title: "Movement Verbs",
      titleAr: "أفعال الحركة",
      color: "from-blue-500 to-indigo-600",
      words: ["walk", "run", "jump", "swim", "fly", "drive", "ride", "climb", "fall", "dance"],
    },
  {
      id: "communication",
      icon: "MessageCircle",
      title: "Communication",
      titleAr: "التواصل",
      color: "from-sky-500 to-cyan-600",
      words: ["say", "tell", "speak", "talk", "ask", "answer", "explain", "discuss", "describe", "agree"],
    },
  {
      id: "thinking",
      icon: "Brain",
      title: "Thinking Verbs",
      titleAr: "أفعال التفكير",
      color: "from-violet-500 to-purple-600",
      words: ["think", "know", "remember", "forget", "understand", "believe", "decide", "imagine", "wonder", "doubt"],
    },
  {
      id: "time_words",
      icon: "CalendarClock",
      title: "Time Expressions",
      titleAr: "تعبيرات الوقت",
      color: "from-indigo-500 to-blue-600",
      words: ["now", "today", "yesterday", "tomorrow", "soon", "later", "never", "always", "sometimes", "often"],
    },
  {
      id: "money",
      icon: "DollarSign",
      title: "Money & Shopping",
      titleAr: "المال والتسوق",
      color: "from-emerald-500 to-green-600",
      words: ["money", "price", "cost", "buy", "sell", "pay", "shop", "market", "customer", "bill"],
    },
  {
      id: "health",
      icon: "Stethoscope",
      title: "Health",
      titleAr: "الصحة",
      color: "from-red-500 to-rose-600",
      words: ["doctor", "hospital", "medicine", "ill", "healthy", "pain", "headache", "exercise", "sleep", "dentist"],
    },
  {
      id: "travel",
      icon: "Plane",
      title: "Travel",
      titleAr: "السفر",
      color: "from-cyan-500 to-blue-600",
      words: ["travel", "trip", "journey", "holiday", "hotel", "ticket", "passport", "tourist", "visit", "map"],
    },
  {
      id: "tech",
      icon: "Laptop",
      title: "Technology",
      titleAr: "التكنولوجيا",
      color: "from-slate-500 to-gray-700",
      words: ["computer", "phone", "internet", "email", "website", "screen", "video", "software", "online", "data"],
    },
  {
      id: "size",
      icon: "Ruler",
      title: "Size & Shape",
      titleAr: "الحجم والشكل",
      color: "from-orange-500 to-amber-600",
      words: ["big", "small", "large", "little", "tall", "short", "long", "wide", "narrow", "huge"],
    },
  ];

  // Helper: level lookup for words inside families.
  import { oxfordWordsByLevel } from "@/data/oxford-words";

  const _levelByWord = new Map<string, CEFRLevel>();
  for (const level of ["A1", "A2", "B1", "B2"] as CEFRLevel[]) {
    for (const word of oxfordWordsByLevel[level]) {
      const key = word.toLowerCase();
      if (!_levelByWord.has(key)) _levelByWord.set(key, level);
    }
  }

  export function levelOfWord(word: string): CEFRLevel {
    return _levelByWord.get(word.toLowerCase()) ?? "A1";
  }
  
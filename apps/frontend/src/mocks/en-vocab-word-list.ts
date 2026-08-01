import type { VocabWordPage } from "@/views/learning/english-v2/en-vocab-v2.types";

const mockWords: VocabWordPage["items"] = [
  {
    word: "hello",
    phonetics: [
      {
        ipa: "/həˈloʊ/",
        source: "Oxford",
        audio: "https://example.com/audio/hello-us.mp3",
        syllableParts: [
          { text: "hel", stressed: false },
          { text: "LO", stressed: true },
        ],
      },
    ],
    partsOfSpeech: "excl, noun, verb",
    meanings: [
      {
        posLabel: "[thán từ]",
        en: "Used as a greeting when meeting someone.",
        vi: "Dùng để chào hỏi khi gặp ai đó →Xin chào, Chào",
      },
      {
        posLabel: "[thán từ] — điện thoại",
        en: "Used when answering or starting a phone call.",
        vi: "Dùng khi nghe/gọi điện thoại →A lô",
      },
      {
        posLabel: "[thán từ] — thu hút sự chú ý",
        en: "Used to attract attention or express mild surprise.",
        vi: "Thu hút sự chú ý hoặc bày tỏ ngạc nhiên →Ơi, Này, Ô kìa",
      },
      {
        posLabel: "[danh từ]",
        en: 'An instance of saying "hello"; a greeting.',
        vi: "Lời chào hỏi →Lời chào",
      },
    ],
    examples: [
      { en: "Hello! Nice to meet you.", vi: "Xin chào! Rất vui được gặp bạn." },
      { en: "She said hello to me on the way in.", vi: "Cô ấy chào tôi trên đường vào." },
      { en: "Hello? Can you hear me?", vi: "A lô? Bạn nghe tôi không?" },
    ],
    phrases: [
      { en: "Hello there!", vi: "Chào bạn!" },
      { en: "Say hello to someone", vi: "Chào hỏi / Gửi lời chào tới ai đó" },
      { en: "Give my hello to your family", vi: "Chuyển lời chào của tôi tới gia đình bạn" },
      { en: "Hello? Earth to you!", vi: "Này! Bạn có nghe không? (khi ai đó không chú ý)" },
    ],
    wordGroup: "Chào hỏi & Từ cơ bản nhất",
    searchKeywords: "hello",
    synonyms: "hi, hey, greetings",
    antonyms: "goodbye, bye",
  },
  {
    word: "goodbye",
    phonetics: [
      {
        ipa: "/ˌɡʊdˈbaɪ/",
        source: "Oxford",
        audio: null,
        syllableParts: [
          { text: "good", stressed: false },
          { text: "BYE", stressed: true },
        ],
      },
    ],
    partsOfSpeech: "excl, noun",
    meanings: [
      {
        posLabel: "[thán từ]",
        en: "Said when parting from someone.",
        vi: "Nói khi chia tay, rời đi →Tạm biệt",
      },
      {
        posLabel: "[danh từ]",
        en: "An act of saying goodbye; a farewell.",
        vi: "Lời / hành động tạm biệt →Lời tạm biệt, Cuộc chia tay",
      },
    ],
    examples: [
      { en: "Goodbye! Have a safe trip.", vi: "Tạm biệt! Chúc bạn đi đường bình an." },
      { en: "It was a tearful goodbye at the airport.", vi: "Đó là một cuộc chia tay đẫm nước mắt ở sân bay." },
    ],
    phrases: [
      { en: "Say goodbye to someone", vi: "Nói lời tạm biệt với ai đó" },
      { en: "Kiss goodbye to something", vi: "Từ bỏ điều gì đó" },
    ],
    wordGroup: "Chào hỏi & Từ cơ bản nhất",
    searchKeywords: "goodbye bye",
    synonyms: "farewell, bye, see you",
    antonyms: "hello, hi",
  },
  {
    word: "please",
    phonetics: [
      {
        ipa: "/pliːz/",
        source: "Cambridge",
        audio: "https://example.com/audio/please-uk.mp3",
        syllableParts: [{ text: "PLEASE", stressed: true }],
      },
    ],
    partsOfSpeech: "adv, verb",
    meanings: [
      {
        posLabel: "[trạng từ] — lịch sự",
        en: "Used to add politeness to a request or command.",
        vi: "Dùng để thêm sự lịch sự vào yêu cầu →Làm ơn, Xin",
      },
      {
        posLabel: "[động từ]",
        en: "To give someone pleasure or satisfaction.",
        vi: "Làm ai đó vui lòng, hài lòng →Làm hài lòng",
      },
    ],
    examples: [
      { en: "Could you please help me?", vi: "Bạn có thể giúp tôi được không?" },
      { en: "She always tries to please her boss.", vi: "Cô ấy luôn cố gắng làm hài lòng sếp." },
    ],
    phrases: [
      { en: "Please do!", vi: "Được chứ! / Cứ tự nhiên!" },
      { en: "As you please", vi: "Tùy bạn, tùy ý bạn" },
    ],
    wordGroup: "Lịch sự & Giao tiếp cơ bản",
    searchKeywords: "please polite request",
    synonyms: "kindly, if you would",
    antonyms: "",
  },
];

// Wrapped in GraphQL envelope — required by graphqlApi.fetch mock fallback
export const EnVocabWordList_MockData = {
  data: {
    enItVocabs: {
      items: mockWords,
      meta: { pagination: { page: 1, pageSize: 10, total: 3 } },
    },
  },
};

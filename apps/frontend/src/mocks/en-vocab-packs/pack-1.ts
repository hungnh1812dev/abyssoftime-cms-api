export const pack1Mock = {
  packName: "Pack 1",
  packTitle: "Chào hỏi & Từ cơ bản nhất",
  wordRange: "Từ 1 – 10",
  words: [
    {
      id: 1,
      word: "hello",
      phonetics: {
        ipa: "/həˈloʊ/",
        syllableParts: [
          { text: "hel", stressed: false },
          { text: "LO", stressed: true },
        ],
      },
      partsOfSpeech: ["excl", "noun", "verb"],
      meanings: [
        {
          posLabel: "[thán từ]",
          en: "Used as a greeting when meeting someone.",
          vi: "Dùng để chào hỏi khi gặp ai đó → Xin chào, Chào",
        },
        {
          posLabel: "[thán từ] — điện thoại",
          en: "Used when answering or starting a phone call.",
          vi: "Dùng khi nghe/gọi điện thoại → A lô",
        },
        {
          posLabel: "[thán từ] — thu hút sự chú ý",
          en: "Used to attract attention or express mild surprise.",
          vi: "Thu hút sự chú ý hoặc bày tỏ ngạc nhiên → Ơi, Này, Ô kìa",
        },
        {
          posLabel: "[danh từ]",
          en: 'An instance of saying "hello"; a greeting.',
          vi: "Lời chào hỏi → Lời chào",
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
      searchKeywords: "hello",
    },
    {
      id: 2,
      word: "goodbye",
      phonetics: {
        ipa: "/ˌɡʊdˈbaɪ/",
        syllableParts: [
          { text: "good", stressed: false },
          { text: "BYE", stressed: true },
        ],
      },
      partsOfSpeech: ["excl", "noun"],
      meanings: [
        {
          posLabel: "[thán từ]",
          en: "Said when parting from someone.",
          vi: "Nói khi chia tay, rời đi → Tạm biệt",
        },
        {
          posLabel: "[danh từ]",
          en: "An act of saying goodbye; a farewell.",
          vi: "Lời / hành động tạm biệt → Lời tạm biệt, Cuộc chia tay",
        },
      ],
      examples: [
        { en: "Goodbye! Have a safe trip.", vi: "Tạm biệt! Chúc bạn đi đường bình an." },
        {
          en: "It was a tearful goodbye at the airport.",
          vi: "Đó là một cuộc chia tay đầy nước mắt ở sân bay.",
        },
      ],
      phrases: [
        { en: "Say goodbye", vi: "Nói lời tạm biệt" },
        { en: "Goodbye for now!", vi: "Tạm biệt, gặp lại sau!" },
        { en: "Wave goodbye", vi: "Vẫy tay tạm biệt" },
        { en: "Bye! / Bye-bye!", vi: "Bye! / Bái bai! (thân mật hơn)" },
      ],
      searchKeywords: "goodbye",
    },
    {
      id: 3,
      word: "please",
      phonetics: {
        ipa: "/pliːz/",
        syllableParts: [{ text: "PLEASE", stressed: true }],
        syllableNote: "(1 âm tiết)",
      },
      partsOfSpeech: ["adv", "verb"],
      meanings: [
        {
          posLabel: "[trạng từ] — lịch sự khi nhờ vả",
          en: "Used to add politeness to a request or command.",
          vi: "Thêm vào câu nhờ vả để lịch sự hơn → Làm ơn, Vui lòng, Xin hãy",
        },
        {
          posLabel: "[trạng từ] — đồng ý nhận",
          en: "Used to accept an offer politely.",
          vi: "Đồng ý nhận lời mời một cách lịch sự → Vâng được ạ, Cảm ơn cho tôi một cái",
        },
        {
          posLabel: "[động từ]",
          en: "To give pleasure or satisfaction to someone.",
          vi: "Làm cho ai đó vui lòng, hài lòng → Làm hài lòng, Làm vui lòng",
        },
        {
          posLabel: "[động từ] — (trang trọng)",
          en: "To wish or choose to do something.",
          vi: "Muốn / tùy ý → Tùy ý, Muốn",
        },
      ],
      examples: [
        {
          en: "Could you please help me with this?",
          vi: "Bạn có thể làm ơn giúp tôi với cái này không?",
        },
        {
          en: '"Would you like some tea?" — "Yes, please!"',
          vi: '"Bạn có muốn uống trà không?" — "Vâng, cho tôi một ly!"',
        },
        {
          en: "I always try to please my customers.",
          vi: "Tôi luôn cố gắng làm hài lòng khách hàng.",
        },
      ],
      phrases: [
        { en: "Please come in.", vi: "Mời vào." },
        { en: "Yes, please!", vi: "Vâng, được ạ! (nhận lời mời)" },
        { en: "Do as you please.", vi: "Làm theo ý bạn thích." },
        { en: "Hard to please", vi: "Khó chiều, khó làm hài lòng" },
        { en: "People-pleaser", vi: "Người hay chiều lòng mọi người" },
      ],
      searchKeywords: "please",
    },
    {
      id: 4,
      word: "thank you",
      phonetics: {
        ipa: "/ˈθæŋk juː/",
        syllableParts: [
          { text: "THANK", stressed: true },
          { text: "you", stressed: false },
        ],
      },
      partsOfSpeech: ["excl", "phrase"],
      meanings: [
        {
          posLabel: "[thán từ] — biết ơn",
          en: "Used to express gratitude toward someone.",
          vi: "Bày tỏ lòng biết ơn → Cảm ơn, Cảm ơn bạn",
        },
        {
          posLabel: "[thán từ] — từ chối lịch sự",
          en: 'Used with "no" to politely decline an offer.',
          vi: '"Không, cảm ơn" — từ chối lịch sự',
        },
      ],
      examples: [
        { en: "Thank you for your help!", vi: "Cảm ơn bạn đã giúp đỡ!" },
        {
          en: '"Do you want more coffee?" — "No, thank you."',
          vi: '"Bạn có muốn thêm cà phê không?" — "Không, cảm ơn."',
        },
        {
          en: "Thank you so much for everything.",
          vi: "Cảm ơn bạn rất nhiều vì tất cả.",
        },
      ],
      phrases: [
        { en: "Thank you very much!", vi: "Cảm ơn rất nhiều!" },
        { en: "Thanks! (informal)", vi: "Cảm ơn nhé! (thân mật)" },
        { en: "Thank you in advance.", vi: "Cảm ơn trước." },
        { en: "A big thank you to...", vi: "Lời cảm ơn chân thành đến..." },
        { en: "Thanks a lot!", vi: "Cảm ơn nhiều lắm!" },
      ],
      searchKeywords: "thank you thanks",
    },
    {
      id: 5,
      word: "sorry",
      phonetics: {
        ipa: "/ˈsɑːri/",
        syllableParts: [
          { text: "SOR", stressed: true },
          { text: "ry", stressed: false },
        ],
      },
      partsOfSpeech: ["excl", "adj"],
      meanings: [
        {
          posLabel: "[thán từ] — xin lỗi",
          en: "Used to apologize for something you did wrong.",
          vi: "Xin lỗi về điều gì đó → Xin lỗi, Tôi xin lỗi",
        },
        {
          posLabel: "[thán từ] — nhờ nhắc lại",
          en: "Used to ask someone to repeat what they said.",
          vi: "Nhờ nhắc lại → Xin lỗi? Bạn nói gì ạ?",
        },
        {
          posLabel: "[tính từ] — hối tiếc",
          en: "Feeling regret or guilt about something.",
          vi: "Cảm thấy hối hận, áy náy → Tiếc, Hối hận, Xin lỗi",
        },
        {
          posLabel: "[tính từ] — thương cảm",
          en: "Feeling sympathy for someone else's misfortune.",
          vi: "Thương, Tiếc cho ai → Thương, Ái ngại",
        },
        {
          posLabel: "[tính từ] — informal: đáng thương",
          en: "In a bad or pitiful state.",
          vi: "Trong tình trạng tệ hại, đáng thương → Đáng thương, Tệ",
        },
      ],
      examples: [
        {
          en: "I'm sorry I'm late. The traffic was terrible.",
          vi: "Tôi xin lỗi vì đến trễ. Đường xá tắc nghẽn kinh khủng.",
        },
        {
          en: "I'm so sorry to hear about your loss.",
          vi: "Tôi rất tiếc khi nghe tin bạn mất mát như vậy.",
        },
        { en: "Sorry? Could you say that again?", vi: "Xin lỗi? Bạn có thể nói lại không?" },
      ],
      phrases: [
        { en: "I'm so sorry.", vi: "Tôi thật sự xin lỗi." },
        { en: "Sorry about that.", vi: "Xin lỗi vì điều đó." },
        { en: "Feel sorry for someone", vi: "Thương ai, tội nghiệp ai" },
        { en: "Sorry to bother you.", vi: "Xin lỗi vì đã làm phiền bạn." },
        { en: "Say sorry / Apologize", vi: "Nói lời xin lỗi" },
      ],
      searchKeywords: "sorry apologize apology",
    },
    {
      id: 6,
      word: "excuse me",
      phonetics: {
        ipa: "/ɪkˈskjuːz miː/",
        syllableParts: [
          { text: "ex", stressed: false },
          { text: "CUSE", stressed: true },
          { text: "me", stressed: false },
        ],
      },
      partsOfSpeech: ["excl", "phrase"],
      meanings: [
        {
          posLabel: "[thán từ] — hỏi lịch sự",
          en: "Used to politely interrupt or get someone's attention.",
          vi: "Dùng để hỏi hoặc ngắt lời một cách lịch sự → Xin lỗi cho hỏi, Cho tôi hỏi",
        },
        {
          posLabel: "[thán từ] — xin đi qua",
          en: "Used when you need to pass someone or move through a crowd.",
          vi: "Khi cần đi qua chỗ ai đó → Cho tôi qua, Xin phép đi qua",
        },
        {
          posLabel: "[thán từ] — nhờ nhắc lại",
          en: "Said with rising intonation to ask someone to repeat themselves.",
          vi: "Nhờ người kia nói lại (giọng lên cao) → Bạn nói gì ạ? Xin lỗi?",
        },
        {
          posLabel: "[thán từ] — xin phép rời đi",
          en: "Used to politely leave a conversation or situation.",
          vi: "Xin phép rời cuộc trò chuyện → Xin phép tôi đi, Cho tôi xin phép",
        },
      ],
      examples: [
        {
          en: "Excuse me, where is the nearest subway station?",
          vi: "Xin lỗi, trạm tàu điện ngầm gần nhất ở đâu ạ?",
        },
        {
          en: "Excuse me, could I get past? Thank you.",
          vi: "Cho tôi đi qua được không? Cảm ơn.",
        },
        { en: "Excuse me, I need to take this call.", vi: "Xin phép tôi phải nghe điện thoại." },
      ],
      phrases: [
        { en: "Excuse me, but…", vi: "Xin lỗi, nhưng… (phản đối nhẹ)" },
        { en: "Excuse me? ↗", vi: "Bạn nói gì ạ? (giọng ngạc nhiên hoặc nhờ nhắc lại)" },
        {
          en: "If you'll excuse me…",
          vi: "Nếu bạn cho phép tôi… (lịch sự xin phép rời)",
        },
        { en: "Pardon me (formal)", vi: "Xin lỗi (trang trọng hơn excuse me)" },
      ],
      searchKeywords: "excuse me pardon",
    },
    {
      id: 7,
      word: "yes",
      phonetics: {
        ipa: "/jɛs/",
        syllableParts: [{ text: "YES", stressed: true }],
        syllableNote: "(1 âm tiết)",
      },
      partsOfSpeech: ["excl", "adv", "noun"],
      meanings: [
        {
          posLabel: "[trạng từ] — đồng ý / xác nhận",
          en: "Used to agree with, accept, or confirm something.",
          vi: "Đồng ý, xác nhận → Có, Vâng, Ừ, Phải",
        },
        {
          posLabel: "[trạng từ] — phản bác câu phủ định",
          en: "Used to contradict a negative statement or question.",
          vi: '"Không thích à?" — "Có, thích chứ!" (phản bác phủ định)',
        },
        {
          posLabel: "[thán từ] — vui mừng",
          en: "Expressing excitement, triumph, or pleasure.",
          vi: "Bày tỏ vui mừng, phấn khích → Ừ! Được rồi! Tuyệt!",
        },
        {
          posLabel: "[danh từ]",
          en: "An affirmative answer or decision.",
          vi: "Câu trả lời / quyết định đồng ý → Lời đồng ý",
        },
      ],
      examples: [
        { en: "Yes, I'd love to come to the party!", vi: "Vâng, tôi rất muốn đến bữa tiệc!" },
        {
          en: '"You don\'t like spicy food?" — "Yes, I do!"',
          vi: '"Bạn không thích đồ cay à?" — "Có, tôi thích chứ!"',
        },
        { en: "She finally said yes to his proposal.", vi: "Cuối cùng cô ấy đã đồng ý lời cầu hôn của anh ấy." },
      ],
      phrases: [
        { en: "Yes, please!", vi: "Vâng, được ạ! (nhận lời mời)" },
        { en: "Yes or no?", vi: "Có hay không? (hỏi thẳng)" },
        { en: "Oh yes!", vi: "Ồ, có chứ! / Đúng vậy!" },
        { en: "Yeah / Yep (informal)", vi: "Ừ / Ừ hả (thân mật)" },
        { en: "Say yes to opportunities", vi: "Nắm bắt / Đồng ý với cơ hội" },
      ],
      searchKeywords: "yes yeah yep",
    },
    {
      id: 8,
      word: "no",
      phonetics: {
        ipa: "/noʊ/",
        syllableParts: [{ text: "NO", stressed: true }],
        syllableNote: "(1 âm tiết)",
      },
      partsOfSpeech: ["excl", "adv", "noun", "adj"],
      meanings: [
        {
          posLabel: "[trạng từ / thán từ] — từ chối / phủ nhận",
          en: "Used to refuse, disagree, or give a negative answer.",
          vi: "Từ chối, không đồng ý → Không",
        },
        {
          posLabel: "[tính từ] — không có",
          en: 'Not any; used before a noun to mean "none of".',
          vi: "Không có → There is no time. / Không còn thời gian.",
        },
        {
          posLabel: "[danh từ]",
          en: "A refusal or negative answer; a vote against.",
          vi: "Câu từ chối, phiếu chống → Lời từ chối",
        },
        {
          posLabel: "[thán từ] — ngạc nhiên / không tin",
          en: "Expressing shock or disbelief.",
          vi: "Bày tỏ ngạc nhiên, không tin → Không thể nào! Ôi không!",
        },
      ],
      examples: [
        { en: "No, thank you. I'm full.", vi: "Không, cảm ơn. Tôi no rồi." },
        {
          en: "There is no parking available here.",
          vi: "Không có chỗ đỗ xe ở đây.",
        },
        { en: '"She quit her job!" — "No way!"', vi: '"Cô ấy nghỉ việc rồi!" — "Không thể nào!"' },
      ],
      phrases: [
        { en: "No way!", vi: "Không đời nào! / Không thể nào!" },
        { en: "No problem.", vi: "Không vấn đề gì. / Không sao." },
        { en: "No worries.", vi: "Đừng lo. / Không sao đâu." },
        { en: "No more.", vi: "Không còn nữa." },
        { en: "Absolutely not!", vi: 'Hoàn toàn không! (mạnh hơn "no")' },
      ],
      searchKeywords: "no nope nah",
    },
    {
      id: 9,
      word: "okay",
      phonetics: {
        ipa: "/oʊˈkeɪ/",
        syllableParts: [
          { text: "o", stressed: false },
          { text: "KAY", stressed: true },
        ],
      },
      partsOfSpeech: ["excl", "adj", "verb", "noun"],
      meanings: [
        {
          posLabel: "[thán từ] — đồng ý / chấp nhận",
          en: "Used to express agreement, acceptance, or readiness.",
          vi: "Đồng ý, chấp nhận, sẵn sàng → Được rồi, Ổn thôi, OK",
        },
        {
          posLabel: "[tính từ] — ổn / được chấp nhận",
          en: "Satisfactory but not exceptional; acceptable.",
          vi: "Ổn, được, chấp nhận được → Bình thường, Ổn",
        },
        {
          posLabel: "[tính từ] — khỏe / không sao",
          en: "In a safe or healthy condition; not hurt.",
          vi: "Khỏe, không bị sao → Ổn, Không sao",
        },
        {
          posLabel: "[động từ]",
          en: "To formally approve or authorize something.",
          vi: "Chính thức phê duyệt → Đồng ý cho, Chấp thuận",
        },
      ],
      examples: [
        { en: "Okay, let's meet at 7 p.m. then!", vi: "Được rồi, vậy mình gặp nhau lúc 7 giờ tối nhé!" },
        { en: "Are you okay? You look a bit pale.", vi: "Bạn có ổn không? Trông bạn hơi xanh xao." },
        { en: "The food was okay, nothing special.", vi: "Đồ ăn ổn thôi, không có gì đặc biệt." },
      ],
      phrases: [
        { en: "Are you okay?", vi: "Bạn có ổn không?" },
        { en: "It's okay.", vi: "Không sao đâu. / Ổn mà." },
        { en: "That's okay with me.", vi: "Tôi đồng ý. / Tôi không phản đối." },
        { en: "Just okay.", vi: "Cũng được / Bình thường thôi." },
        { en: "Give the okay", vi: "Phê duyệt, cho phép" },
      ],
      searchKeywords: "okay ok alright",
    },
    {
      id: 10,
      word: "help",
      phonetics: {
        ipa: "/hɛlp/",
        syllableParts: [{ text: "HELP", stressed: true }],
        syllableNote: "(1 âm tiết)",
      },
      partsOfSpeech: ["verb", "noun", "excl"],
      meanings: [
        {
          posLabel: "[động từ] — hỗ trợ ai đó",
          en: "To make it easier for someone to do something; to assist.",
          vi: "Hỗ trợ, giúp đỡ → Giúp, Giúp đỡ",
        },
        {
          posLabel: "[danh từ] — sự giúp đỡ",
          en: "Assistance given to someone in need.",
          vi: "Sự trợ giúp → Sự giúp đỡ, Hỗ trợ",
        },
        {
          posLabel: "[thán từ] — kêu cứu",
          en: "Shouted when in danger or needing urgent assistance.",
          vi: "Kêu cứu khẩn cấp → Cứu tôi với! Cứu với!",
        },
        {
          posLabel: "[động từ] — can't help: không tránh được",
          en: "Cannot avoid or prevent something.",
          vi: "Không thể tránh khỏi → I can't help it. / Tôi không thể tránh được.",
        },
      ],
      examples: [
        { en: "Can you help me carry this bag?", vi: "Bạn có thể giúp tôi xách chiếc túi này không?" },
        {
          en: "Thank you so much for all your help.",
          vi: "Cảm ơn bạn rất nhiều vì tất cả sự giúp đỡ.",
        },
        {
          en: "I can't help laughing every time I see that video.",
          vi: "Tôi không nhịn được cười mỗi khi xem video đó.",
        },
      ],
      phrases: [
        { en: "Help yourself!", vi: "Cứ tự nhiên! (mời dùng đồ ăn/đồ vật)" },
        { en: "I can't help it.", vi: "Tôi không thể tránh được." },
        { en: "With the help of…", vi: "Với sự giúp đỡ của…" },
        { en: "Cry / Call for help", vi: "Kêu cứu" },
        { en: "Self-help", vi: "Tự hoàn thiện bản thân (sách, kỹ năng...)" },
      ],
      searchKeywords: "help assist support",
    },
  ],
};

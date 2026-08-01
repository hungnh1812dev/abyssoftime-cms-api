import type { VocabPackPage } from "@/views/learning/english-v2/en-vocab-v2.types";

const TOPICS = [
  "Chào hỏi & Từ cơ bản nhất",
  "Lịch sự & Giao tiếp cơ bản",
  "Gia đình & Các mối quan hệ",
  "Con số & Thời gian",
  "Đồ ăn & Thức uống",
  "Nơi chốn & Di chuyển",
  "Cảm xúc & Tính cách",
  "Công việc & Trường học",
  "Mua sắm & Tiền bạc",
  "Sức khỏe & Cơ thể",
  "Thời tiết & Thiên nhiên",
];

// Must match GROUP_CHUNK_SIZE / GROUP_SIZE (words per pack) from GroupPicker.tsx
const WORDS_PER_PACK = 10;
// 105 words = 11 packs = 2 groups (group 1 full, group 2 has 1 partial pack) — enough to exercise clamping
const TOTAL_WORDS = 105;

const mockGroupItems: VocabPackPage["items"] = Array.from({ length: TOTAL_WORDS }, (_, i) => ({
  wordGroup: TOPICS[Math.floor(i / WORDS_PER_PACK) % TOPICS.length],
}));

// Wrapped in GraphQL envelope — required by graphqlApi.fetch mock fallback
export const EnVocabWordGroups_MockData = {
  data: {
    enItVocabs: {
      items: mockGroupItems,
      meta: { pagination: { page: 1, pageSize: 100, total: TOTAL_WORDS } },
    },
  },
};

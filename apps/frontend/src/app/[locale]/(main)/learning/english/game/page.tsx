import type { Metadata } from "next";

import { GamePage } from "@/views/learning/english-v2/game/GamePage";

export const metadata: Metadata = {
  title: "Word Recall Game",
  description: "Kiểm tra từ vựng đã học bằng trò chơi nhớ từ.",
};

export default function LearningEnglishGamePage() {
  return <GamePage />;
}

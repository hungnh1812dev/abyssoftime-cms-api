import type { CvContactType, CvPageDataType } from "../CvPage";
import Image from "next/image";

import localAvatar from "@/assets/images/avatar.jpg";

interface CvHeaderProps {
  contact: CvContactType;
  position: CvPageDataType["position"];
}

export const CvHeader = ({ contact, position }: CvHeaderProps) => {
  return (
    <header className="mb-4 flex items-center gap-5 border-b border-border/40 pb-4 sm:gap-6">
      <Image
        src={contact.avatar.url || localAvatar.src}
        alt="Profile Avatar"
        width={96}
        height={96}
        className="h-20 w-20 shrink-0 rounded-full border-2 border-blue-600/50 object-cover sm:h-24 sm:w-24"
      />
      <div className="min-w-0 flex-1">
        <h1 className="m-0 text-2xl font-bold tracking-tight md:text-3xl">{contact.name}</h1>
        <h2 className="m-0 mt-0.5 text-sm font-medium text-foreground/60 sm:text-base">{position}</h2>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-foreground/65 sm:text-sm">
          <span>{contact.address}</span>
          <span className="text-foreground/30">·</span>
          <a href={`tel:${contact.phone}`} className="hover:text-blue-600 hover:underline">
            {contact.phone}
          </a>
          <span className="text-foreground/30">·</span>
          <a href={`mailto:${contact.email}`} className="hover:text-blue-600 hover:underline">
            {contact.email}
          </a>
          <span className="text-foreground/30">·</span>
          <a target="_blank" rel="noopener noreferrer" href={contact.linkedin} className="hover:text-blue-600 hover:underline">
            LinkedIn
          </a>
          <span className="text-foreground/30">·</span>
          <a target="_blank" rel="noopener noreferrer" href={contact.github} className="hover:text-blue-600 hover:underline">
            GitHub
          </a>
        </div>
      </div>
    </header>
  );
};

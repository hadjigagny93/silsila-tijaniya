import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Le HTML brut reste du texte, et les liens dangereux sont retirés par react-markdown.
// Pas d'images : une image distante chargerait un site tiers à chaque lecture.
export function MarkdownText({ children }: { children: string }) {
  return (
    <div className="markdown">
      <Markdown remarkPlugins={[remarkGfm]} disallowedElements={["img"]} unwrapDisallowed>
        {children}
      </Markdown>
    </div>
  );
}

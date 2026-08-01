import { HTMLReactParserOptions } from "html-react-parser";
import HTMLReactParser from "html-react-parser/lib/index";

interface HTMLParserProps {
  content: string;
  options?: HTMLReactParserOptions;
  component?: keyof React.JSX.IntrinsicElements;
  className?: string;
}

const defaultOptions: HTMLReactParserOptions = {};

export const HTMLParser = ({ content, options, component = "div", className }: HTMLParserProps) => {
  const Comp = component;
  return content && <Comp className={className}>{HTMLReactParser(content, options || defaultOptions)}</Comp>;
};

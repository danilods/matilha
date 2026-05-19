export type AdfTextNode = {
  type: "text";
  text: string;
};

export type AdfParagraphNode = {
  type: "paragraph";
  content: AdfTextNode[];
};

export type AdfBulletListNode = {
  type: "bulletList";
  content: Array<{
    type: "listItem";
    content: AdfParagraphNode[];
  }>;
};

export type AdfDocument = {
  type: "doc";
  version: 1;
  content: Array<AdfParagraphNode | AdfBulletListNode>;
};

function paragraph(text: string): AdfParagraphNode {
  return {
    type: "paragraph",
    content: text.trim().length > 0 ? [{ type: "text", text: text.trim() }] : []
  };
}

function bulletList(items: string[]): AdfBulletListNode {
  return {
    type: "bulletList",
    content: items.map((item) => ({
      type: "listItem",
      content: [paragraph(item)]
    }))
  };
}

export function markdownToAdf(markdown: string): AdfDocument {
  const content: AdfDocument["content"] = [];
  const lines = markdown.split(/\r?\n/);
  let bullets: string[] = [];
  let paragraphLines: string[] = [];

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return;
    content.push(paragraph(paragraphLines.join(" ")));
    paragraphLines = [];
  };

  const flushBullets = () => {
    if (bullets.length === 0) return;
    content.push(bulletList(bullets));
    bullets = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line.length === 0) {
      flushParagraph();
      flushBullets();
      continue;
    }

    const bullet = line.match(/^[-*]\s+(.+)$/);
    if (bullet) {
      flushParagraph();
      bullets.push(bullet[1] ?? "");
      continue;
    }

    flushBullets();
    paragraphLines.push(line.replace(/^#+\s*/, ""));
  }

  flushParagraph();
  flushBullets();

  return {
    type: "doc",
    version: 1,
    content: content.length > 0 ? content : [paragraph("")]
  };
}

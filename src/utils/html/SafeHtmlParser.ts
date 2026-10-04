import * as cheerio from 'cheerio';

export class SafeHtmlParser {
  static extractText(html: string): string {
    const $ = cheerio.load(html, { scriptingEnabled: false } as any);
    $('script, style').remove();
    return $.root().text().replace(/\s+/g, ' ').trim();
  }

  static extractLinks(html: string): string[] {
    const $ = cheerio.load(html, { scriptingEnabled: false } as any);
    const links: string[] = [];
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (href) links.push(href);
    });
    return links;
  }

  static findLinkMatching(html: string, pattern: RegExp): string | undefined {
    const links = this.extractLinks(html);
    return links.find((link) => pattern.test(link));
  }
}

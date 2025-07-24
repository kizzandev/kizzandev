import { promises as fs } from "fs";
import fetch from "node-fetch";
import Parser from "rss-parser";
import * as http2 from "node:http2";

import { PLACEHOLDERS, NUMBER_OF } from "./constants.js";

const YOUTUBE_KIZZANDEV_CHANNEL_ID = "UChUg0FSY3YIeo5t6SNtlo9Q";

const { YOUTUBE_API_KEY } = process.env;

const parser = new Parser();

const getLatestArticles = async (url) => {
  const { hostname, pathname } = new URL(url); 

  return new Promise((resolve, reject) => {
    const client = http2.connect(`https://${hostname}`);

    client.on('error', (err) => {
      reject(err);
    });

    const req = client.request({
      ':method': 'GET',
      ':path': pathname,
      'user-agent': 'MyRSSReader/1.0 (via node:http2)',
    });

    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });

    req.on('end', () => {
      client.close();
      resolve(data);
    });

    req.on('response', (headers) => {
      if (headers[':status'] !== 200) {
        client.close();
        reject(new Error(`HTTP/2 request failed with status: ${headers[':status']}`));
      }
    });

    req.end();
  });
};

const getLatestYoutubeVideos = (
  { channelId } = { channelId: YOUTUBE_KIZZANDEV_CHANNEL_ID }
) =>
  fetch(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${channelId}&maxResults=${NUMBER_OF.VIDEOS}&key=${YOUTUBE_API_KEY}`
  )
    .then((res) => {
      if (!res.ok) {
        throw new Error(`YouTube API request failed with status: ${res.status}`);
      }
      return res.json();
    })
    .then((videos) => videos.items)
    .catch((error) => {
      console.error("Error fetching YouTube videos:", error);
      return [];
    });

const genYoutubeCard = ({ title, videoId }) => `
<a href="https://www.youtube.com/watch?v=${videoId}" target="_blank">
  <img src="https://img.youtube.com/vi/${videoId}/mqdefault.jpg" alt="${title}" />
</a>
`;

(async () => {
  try {
    const [template, articlesXml, videos] = await Promise.all([
      fs.readFile("./src/README.md.tpl", { encoding: "utf-8" }),
      getLatestArticles('https://blog.kizzan.dev/en/rss.xml'),
      // getLatestYoutubeVideos(),
    ]);

    const articles = await parser.parseString(articlesXml);

    const latestsArticlesMd = articles.items
      .slice(0, NUMBER_OF.ARTICLES)
      .sort((a, b) => new Date(b.isoDate) - new Date(a.isoDate))
      //.map(({ title, link }) => `- [${title}](${link})`)
      .map(
        ({ title, link, content, isoDate }) =>
          `- [${title}](${link}) <time style="font-size: 0.8rem;color: #888">• ${isoDate.split("T")[0]}</time>\n  - ${content}`
      )
      .join("\n");

    // const latestsVideosMd = videos
    //   .map(({ snippet }) => {
    //     const { title, resourceId } = snippet;
    //     const { videoId } = resourceId;
    //     return genYoutubeCard({ title, videoId });
    //   })
    //   .join("");

    const newMd = template
      .replace(PLACEHOLDERS.LATESTS_ARTICLES, latestsArticlesMd)
      // .replace(PLACEHOLDERS.VIDEOS, latestsVideosMd);

      await fs.writeFile("README.md", newMd);
  } catch (error) {
    console.error("Error: ", error);
  }
})();

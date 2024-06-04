import { promises as fs } from "fs";
import fetch from "node-fetch";
import Parser from "rss-parser";

import { PLACEHOLDERS, NUMBER_OF } from "./constants.js";

const YOUTUBE_KIZZANDEV_CHANNEL_ID = "UChUg0FSY3YIeo5t6SNtlo9Q";

const { YOUTUBE_API_KEY } = process.env;

const parser = new Parser();

const getLatestArticles = () =>
  parser.parseURL("https://blog.kizzan.dev/rss.xml");

const getLatestYoutubeVideos = (
  { channelId } = { channelId: YOUTUBE_KIZZANDEV_CHANNEL_ID }
) =>
  fetch(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${channelId}&maxResults=${NUMBER_OF.VIDEOS}&key=${YOUTUBE_API_KEY}`
  )
    .then((res) => res.json())
    .then((videos) => videos.items);

const genYoutubeCard = ({ title, videoId }) => `
<a href="https://youtu.be/${videoId}" target="_blank">
  <img src="https://img.youtube.com/vi/${videoId}/mqdefault.jpg" alt="${title}" />
</a>
`;

(async () => {
  const [template, articles, videos] = await Promise.all([
    fs.readFile("./src/README.md.tpl", { encoding: "utf-8" }),
    getLatestArticles(),
    // getLatestYoutubeVideos(),
  ]);

  const latestsArticlesMd = articles.items
    .slice(0, NUMBER_OF.ARTICLES)
    .map(({ title, link, content }) => `- [${title}](${link})`)
    //   .map(
    //     ({ title, link, content }) => `- [${title}](${link})
    // - ${content}`
    //   )
    .join("\n");

  /*const latestsVideosMd = videos
    .map(({ snippet }) => {
      const { title, resourceId } = snippet;
      const { videoId } = resourceId;
      return genYoutubeCard({ title, videoId });
    })
    .join("");*/

  const newMd = template.replace(
    PLACEHOLDERS.LATESTS_ARTICLES,
    latestsArticlesMd
  );
  //.replace(PLACEHOLDERS.VIDEOS, latestsVideosMd);

  await fs.writeFile("README.md", newMd);
})();

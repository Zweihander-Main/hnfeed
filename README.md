# HNFeed

_HN RSS feeds which include the top 4 comments_

Twice a day, will pull in all HN stories submitted 12 to 24 hours ago. Will then sort those stories by points, add the top 4 comments, and output an RSS feed at `./rss_feed.xml`.

Available as a [Docker container](https://hub.docker.com/r/zweizs/hnfeed).

**Current Status:** Very quickly adapted from an old script, use at your own caution

## Dev Notes

### Technologies used:

-   Node
-   TypeScript
-   pnpm
-   axios
-   express
-   LiquidJS
-   Docker

## 💼 Available for Hire

I'm available for freelance, contracts, and consulting both remotely and in the Hudson Valley, NY (USA) area. [Some more about me](https://www.zweisolutions.com/about.html) and [what I can do for you](https://www.zweisolutions.com/services.html).

Feel free to drop me a message at:

```
hi [a+] zweisolutions {●} com
```

## ⚖️ License

[AGPLv3](./LICENSE)

    hnfeed
    Copyright (C) 2023 Zweihänder

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.

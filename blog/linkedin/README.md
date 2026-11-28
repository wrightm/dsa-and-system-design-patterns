# LinkedIn series

One file per post, numbered to match the article's `series` number. Each file holds the status, the link it points at, and the exact text between the two rules.

A post is short: a hook taken from the article's "problem that forces this to exist" section, two or three things the reader will learn, and the link. The full article stays on the site.

Nothing is posted until Michael has approved the exact text. After posting, set `status: posted` and record the date and the post's URL.

## Video

A post can carry a square video, named in its `media:` front matter and kept in `media/`. The video is rendered from the same recorded trace and the same renderer as the animation in the article, so it only ever shows what the Java code did. For example, [the hash map video](media/001-hash-map-put.mp4) comes from the `put` trace:

```sh
cd site
pnpm collect
pnpm video data-structures/hashmap/put ../blog/linkedin/media/001-hash-map-put.mp4
```

It is 1080×1080 at 30 fps, under 60 seconds and under 10 MB, with the captions burned in, as the video has no sound. Re-rendering the same trace on the same machine gives a byte-identical file.

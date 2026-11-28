---
status: draft
article: https://wrightm.github.io/dsa-and-system-design-patterns/data-structures/hashmap/
media: media/001-hash-map-put.mp4
posted:
url:
---

Post text (plain text, as LinkedIn does not render Markdown):

---

Most Java developers use HashMap every day. Far fewer could say why it turns a bucket into a tree at exactly 8 entries, or why the table is three-quarters full when it grows.

I want to be able to answer questions like that, so I'm starting a series. For each data structure, algorithm or design pattern I come across, I will:

1. Build the simple version first and find the point where it breaks.
2. Build the real one in Java, with tests for every claim.
3. Read how the JDK or a well-known library does it, and write down what each design decision cost.
4. Keep the questions I got stuck on, with the answers.

Article 1 is the hash map. A few things from it:

• Store 255 whole-number floats in a naive hash table with 1,024 buckets and every one of them lands in bucket 0. One line of code fixes it.
• Under good hashing, the JDK's own figures put the chance of a bucket reaching 8 entries at about 6 in 100 million. So when it happens, something is wrong, and HashMap switches that bucket to a red-black tree.
• A bad hashCode() makes a HashMap slow. It never makes it wrong. The reverse mistake does.

Code, tests and the article are all open source.

https://wrightm.github.io/dsa-and-system-design-patterns/data-structures/hashmap/

There is no fixed order to the series. I'll write topics up as I meet them. What should I take apart next?

#Java #DataStructures #Algorithms #SoftwareEngineering

---

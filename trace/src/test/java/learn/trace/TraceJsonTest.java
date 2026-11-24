package learn.trace;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class TraceJsonTest {

  @Test
  void writesStepsInOrderWithStableKeyOrder() {
    Map<String, Object> first = new LinkedHashMap<>();
    first.put("size", 0);
    first.put("buckets", List.of());
    Map<String, Object> second = new LinkedHashMap<>();
    second.put("size", 1);
    second.put("ratio", 0.5);
    second.put("done", true);
    second.put("note", null);
    second.put("buckets", List.of(List.of("a", 1)));

    Trace trace =
        new Trace(
            Trace.VERSION,
            "demo",
            "Demo",
            "hashmap",
            "buckets",
            List.of(
                new Step("start", null, first),
                new Step("put a", new Source("Demo.java", 12), second)));

    String expected =
        """
        {
          "version": 1,
          "id": "demo",
          "title": "Demo",
          "kind": "hashmap",
          "layout": "buckets",
          "steps": [
            {
              "caption": "start",
              "source": null,
              "state": {
                "size": 0,
                "buckets": []
              }
            },
            {
              "caption": "put a",
              "source": {
                "file": "Demo.java",
                "line": 12
              },
              "state": {
                "size": 1,
                "ratio": 0.5,
                "done": true,
                "note": null,
                "buckets": [
                  [
                    "a",
                    1
                  ]
                ]
              }
            }
          ]
        }
        """;
    assertThat(TraceJson.write(trace)).isEqualTo(expected);
  }

  @Test
  void writesATraceWithNoSteps() {
    Trace trace = new Trace(Trace.VERSION, "e", "Empty", "k", "l", List.of());
    assertThat(TraceJson.write(trace)).contains("\"steps\": []").endsWith("}\n");
  }

  @Test
  void escapesSpecialCharacters() {
    String caption = "He said \"hi\" \\ <b>&</b>\nnext ü 漢";
    Trace trace =
        new Trace(Trace.VERSION, "e", "T", "k", "l", List.of(new Step(caption, null, Map.of())));
    assertThat(TraceJson.write(trace)).contains("\"He said \\\"hi\\\" \\\\ <b>&</b>\\nnext ü 漢\"");
  }

  @Test
  void escapesAStateKeySoItRoundTrips() {
    String key = "q\"b\\t\tc\u0001";
    Trace trace =
        new Trace(Trace.VERSION, "e", "T", "k", "l", List.of(new Step("s", null, Map.of(key, 1))));
    String json = TraceJson.write(trace);

    String literal = "\"q\\\"b\\\\t\\tc\\u0001\"";
    assertThat(json).contains(literal + ": 1");
    // JSON allows no raw control characters; the only ones left are the layout's newlines.
    assertThat(json.chars().filter(c -> c < 0x20 && c != '\n')).isEmpty();
    assertThat(decodeJsonString(literal)).isEqualTo(key);
  }

  /** Decodes one JSON string literal as RFC 8259 defines it, rejecting anything it forbids. */
  private static String decodeJsonString(String literal) {
    assertThat(literal).startsWith("\"").endsWith("\"");
    StringBuilder out = new StringBuilder();
    for (int i = 1; i < literal.length() - 1; i++) {
      char c = literal.charAt(i);
      if (c < 0x20 || c == '"') {
        throw new IllegalArgumentException("not allowed raw in a JSON string: " + (int) c);
      }
      if (c != '\\') {
        out.append(c);
        continue;
      }
      char e = literal.charAt(++i);
      switch (e) {
        case '"', '\\', '/' -> out.append(e);
        case 'b' -> out.append('\b');
        case 'f' -> out.append('\f');
        case 'n' -> out.append('\n');
        case 'r' -> out.append('\r');
        case 't' -> out.append('\t');
        case 'u' -> {
          out.append((char) Integer.parseInt(literal.substring(i + 1, i + 5), 16));
          i += 4;
        }
        default -> throw new IllegalArgumentException("bad escape: \\" + e);
      }
    }
    return out.toString();
  }

  @Test
  void rejectsUnsupportedValueTypes() {
    Trace trace =
        new Trace(
            Trace.VERSION,
            "e",
            "T",
            "k",
            "l",
            List.of(new Step("s", null, Map.of("bad", new Object()))));
    assertThatThrownBy(() -> TraceJson.write(trace))
        .isInstanceOf(IllegalArgumentException.class)
        .hasMessageContaining("java.lang.Object");
  }
}

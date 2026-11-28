package learn.trace;

import java.util.List;
import java.util.Map;

/** Minimal JSON writer for traces: two-space indent, insertion-ordered keys, {@code \n} endings. */
public final class TraceJson {
  private TraceJson() {}

  public static String write(Trace trace) {
    StringBuilder out = new StringBuilder();
    writeValue(out, toMap(trace), 0);
    out.append('\n');
    return out.toString();
  }

  private static Map<String, Object> toMap(Trace trace) {
    Map<String, Object> map = new java.util.LinkedHashMap<>();
    map.put("version", trace.version());
    map.put("id", trace.id());
    map.put("title", trace.title());
    map.put("kind", trace.kind());
    map.put("layout", trace.layout());
    List<Object> steps = new java.util.ArrayList<>();
    for (Step step : trace.steps()) {
      Map<String, Object> s = new java.util.LinkedHashMap<>();
      s.put("caption", step.caption());
      if (step.source() == null) {
        s.put("source", null);
      } else {
        Map<String, Object> src = new java.util.LinkedHashMap<>();
        src.put("file", step.source().file());
        src.put("line", step.source().line());
        s.put("source", src);
      }
      s.put("state", step.state());
      steps.add(s);
    }
    map.put("steps", steps);
    return map;
  }

  private static void writeValue(StringBuilder out, Object value, int depth) {
    if (value == null) {
      out.append("null");
    } else if (value instanceof String s) {
      writeString(out, s);
    } else if (value instanceof Boolean || value instanceof Number) {
      out.append(value);
    } else if (value instanceof Map<?, ?> map) {
      if (map.isEmpty()) {
        out.append("{}");
        return;
      }
      out.append("{\n");
      boolean first = true;
      for (Map.Entry<?, ?> e : map.entrySet()) {
        if (!first) {
          out.append(",\n");
        }
        first = false;
        indent(out, depth + 1);
        writeString(out, String.valueOf(e.getKey()));
        out.append(": ");
        writeValue(out, e.getValue(), depth + 1);
      }
      out.append('\n');
      indent(out, depth);
      out.append('}');
    } else if (value instanceof List<?> list) {
      if (list.isEmpty()) {
        out.append("[]");
        return;
      }
      out.append("[\n");
      boolean first = true;
      for (Object item : list) {
        if (!first) {
          out.append(",\n");
        }
        first = false;
        indent(out, depth + 1);
        writeValue(out, item, depth + 1);
      }
      out.append('\n');
      indent(out, depth);
      out.append(']');
    } else {
      throw new IllegalArgumentException(
          "Unsupported value type for trace JSON: " + value.getClass().getName());
    }
  }

  private static void indent(StringBuilder out, int depth) {
    out.append("  ".repeat(depth));
  }

  private static void writeString(StringBuilder out, String s) {
    out.append('"');
    for (int i = 0; i < s.length(); i++) {
      char c = s.charAt(i);
      switch (c) {
        case '"' -> out.append("\\\"");
        case '\\' -> out.append("\\\\");
        case '\n' -> out.append("\\n");
        case '\r' -> out.append("\\r");
        case '\t' -> out.append("\\t");
        case '\b' -> out.append("\\b");
        case '\f' -> out.append("\\f");
        default -> {
          if (c < 0x20) {
            out.append(String.format("\\u%04x", (int) c));
          } else {
            out.append(c);
          }
        }
      }
    }
    out.append('"');
  }
}

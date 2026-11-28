package learn.trace;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Collects steps while real code runs. State is copied at the moment {@code step} is called. */
public final class TraceRecorder {
  private final String id;
  private final String title;
  private final String kind;
  private final String layout;
  private final List<Step> steps = new ArrayList<>();

  public TraceRecorder(String id, String title, String kind, String layout) {
    this.id = id;
    this.title = title;
    this.kind = kind;
    this.layout = layout;
  }

  public void step(String caption, Source source, Map<String, Object> state) {
    @SuppressWarnings("unchecked")
    Map<String, Object> copy = (Map<String, Object>) deepCopy(state);
    steps.add(new Step(caption, source, copy));
  }

  public Trace build() {
    return new Trace(Trace.VERSION, id, title, kind, layout, List.copyOf(steps));
  }

  private static Object deepCopy(Object value) {
    if (value instanceof Map<?, ?> map) {
      Map<String, Object> copy = new LinkedHashMap<>();
      for (Map.Entry<?, ?> entry : map.entrySet()) {
        copy.put((String) entry.getKey(), deepCopy(entry.getValue()));
      }
      return java.util.Collections.unmodifiableMap(copy);
    }
    if (value instanceof List<?> list) {
      List<Object> copy = new ArrayList<>(list.size());
      for (Object item : list) {
        copy.add(deepCopy(item));
      }
      return java.util.Collections.unmodifiableList(copy);
    }
    return value;
  }
}

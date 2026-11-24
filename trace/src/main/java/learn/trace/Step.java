package learn.trace;

import java.util.Map;

/** One frame of an animation. {@code source} may be null when no line applies. */
public record Step(String caption, Source source, Map<String, Object> state) {}

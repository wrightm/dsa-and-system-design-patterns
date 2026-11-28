package learn.trace;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

/** Keeps committed trace files in step with the code that records them. */
public final class TraceFiles {
  private static final String UPDATE_PROPERTY = "learn.traces.update";

  private TraceFiles() {}

  /**
   * Fails with an {@link AssertionError} unless {@code file} holds exactly the JSON for {@code
   * trace}. When the system property {@code learn.traces.update} is {@code true} the file is
   * written instead.
   */
  public static void assertFresh(Trace trace, Path file) {
    String expected = TraceJson.write(trace);
    try {
      if (Boolean.getBoolean(UPDATE_PROPERTY)) {
        Path parent = file.getParent();
        if (parent != null) {
          Files.createDirectories(parent);
        }
        Files.writeString(file, expected, StandardCharsets.UTF_8);
        return;
      }
      if (!Files.exists(file) || !expected.equals(Files.readString(file, StandardCharsets.UTF_8))) {
        throw new AssertionError("stale trace: " + file + ". Run ./gradlew test -Ptraces.update");
      }
    } catch (IOException e) {
      throw new UncheckedIOException(e);
    }
  }
}

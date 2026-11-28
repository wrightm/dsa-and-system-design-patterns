package learn.trace;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class TraceFilesTest {
  private static final String FLAG = "learn.traces.update";

  @TempDir Path dir;
  private String saved;

  private final Trace trace =
      new Trace(Trace.VERSION, "id", "T", "k", "l", List.of(new Step("s", null, Map.of("n", 1))));

  @BeforeEach
  void clearFlag() {
    saved = System.getProperty(FLAG);
    System.clearProperty(FLAG);
  }

  @AfterEach
  void restoreFlag() {
    if (saved == null) {
      System.clearProperty(FLAG);
    } else {
      System.setProperty(FLAG, saved);
    }
  }

  @Test
  void failsWhenFileIsMissingOrDiffers() throws IOException {
    Path file = dir.resolve("t.json");
    assertThatThrownBy(() -> TraceFiles.assertFresh(trace, file))
        .isInstanceOf(AssertionError.class)
        .hasMessage("stale trace: " + file + ". Run ./gradlew test -Ptraces.update");

    Files.writeString(file, "old\n", StandardCharsets.UTF_8);
    assertThatThrownBy(() -> TraceFiles.assertFresh(trace, file))
        .isInstanceOf(AssertionError.class)
        .hasMessageContaining("stale trace");

    Files.writeString(file, TraceJson.write(trace), StandardCharsets.UTF_8);
    TraceFiles.assertFresh(trace, file);
  }

  @Test
  void writesWhenUpdateFlagIsSet() throws IOException {
    System.setProperty(FLAG, "true");
    Path file = dir.resolve("nested/deeper/t.json");

    TraceFiles.assertFresh(trace, file);

    assertThat(Files.readString(file, StandardCharsets.UTF_8)).isEqualTo(TraceJson.write(trace));
  }
}

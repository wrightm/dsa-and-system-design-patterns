package learn.trace;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class TraceRecorderTest {

  @Test
  void laterMutationOfStateDoesNotChangeRecordedStep() {
    TraceRecorder recorder = new TraceRecorder("id", "Title", "kind", "layout");
    List<Object> inner = new ArrayList<>(List.of(1, 2));
    Map<String, Object> state = new HashMap<>();
    state.put("items", inner);

    recorder.step("first", new Source("A.java", 3), state);
    inner.add(3);
    state.put("extra", true);

    Trace trace = recorder.build();
    assertThat(trace.version()).isEqualTo(Trace.VERSION);
    assertThat(trace.steps()).hasSize(1);
    assertThat(trace.steps().get(0).state()).containsOnlyKeys("items");
    assertThat(trace.steps().get(0).state().get("items")).isEqualTo(List.of(1, 2));
  }
}

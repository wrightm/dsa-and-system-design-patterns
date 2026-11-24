package learn.trace;

import java.util.List;

/** A complete recording: metadata plus the ordered steps. */
public record Trace(
    int version, String id, String title, String kind, String layout, List<Step> steps) {
  public static final int VERSION = 1;
}

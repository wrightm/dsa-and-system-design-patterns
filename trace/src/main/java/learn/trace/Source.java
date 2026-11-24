package learn.trace;

/** A line in a source file that a step points at. */
public record Source(String file, int line) {}

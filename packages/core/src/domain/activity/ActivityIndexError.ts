export class ActivityIndexDimensionMismatchError extends Error {
  constructor(
    public readonly expectedDimension: number,
    public readonly actualDimension: number
  ) {
    super(
      `Activity index template dimension mismatch: expected ${expectedDimension}, but template has ${actualDimension}. ` +
        `This indicates a configuration mismatch between the embedding adapter and the index template. ` +
        `Please ensure the embedding dimension matches the template dimension.`
    );
    this.name = "ActivityIndexDimensionMismatchError";
  }
}

// =====================================================
// Value Object: DateRange
// Immutable date range with validation
// =====================================================

export class DateRange {
  private readonly startDate: Date;
  private readonly endDate: Date;

  constructor(startDate: Date, endDate: Date) {
    this.validate(startDate, endDate);
    this.startDate = new Date(startDate);
    this.endDate = new Date(endDate);
  }

  private validate(startDate: Date, endDate: Date): void {
    if (!startDate || !(startDate instanceof Date) || isNaN(startDate.getTime())) {
      throw new Error('Start date is required and must be a valid date');
    }

    if (!endDate || !(endDate instanceof Date) || isNaN(endDate.getTime())) {
      throw new Error('End date is required and must be a valid date');
    }

    if (startDate > endDate) {
      throw new Error('Start date must be before or equal to end date');
    }
  }

  getStartDate(): Date {
    return new Date(this.startDate);
  }

  getEndDate(): Date {
    return new Date(this.endDate);
  }

  getDurationInDays(): number {
    const diffTime = this.endDate.getTime() - this.startDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
  }

  getDurationInMonths(): number {
    const months = (this.endDate.getFullYear() - this.startDate.getFullYear()) * 12 +
                   (this.endDate.getMonth() - this.startDate.getMonth());
    return months;
  }

  getDurationInYears(): number {
    return this.getDurationInMonths() / 12;
  }

  contains(date: Date): boolean {
    return date >= this.startDate && date <= this.endDate;
  }

  overlaps(other: DateRange): boolean {
    return this.startDate <= other.endDate && this.endDate >= other.startDate;
  }

  equals(other: DateRange): boolean {
    return this.startDate.getTime() === other.startDate.getTime() &&
           this.endDate.getTime() === other.endDate.getTime();
  }

  toString(): string {
    return `${this.startDate.toISOString().split('T')[0]} to ${this.endDate.toISOString().split('T')[0]}`;
  }

  toJSON(): { startDate: string; endDate: string } {
    return {
      startDate: this.startDate.toISOString(),
      endDate: this.endDate.toISOString(),
    };
  }

  static fromJSON(json: { startDate: string; endDate: string }): DateRange {
    return new DateRange(new Date(json.startDate), new Date(json.endDate));
  }

  static fromDates(startDate: string, endDate: string): DateRange {
    return new DateRange(new Date(startDate), new Date(endDate));
  }
}

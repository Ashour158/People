// =====================================================
// Value Object: Money
// Immutable money value with currency validation
// ⚠️ DEPRECATED: This TypeScript backend is legacy
// Please use Python backend (python_backend/) for all new development
// =====================================================

export class Money {
  private readonly amount: number;
  private readonly currency: string;

  // Common MENA currencies
  private static readonly VALID_CURRENCIES = [
    'USD', 'EUR', 'GBP', 'AED', 'SAR', 'KWD', 'QAR', 'OMR', 'BHD', 
    'JOD', 'EGP', 'MAD', 'TND', 'LBP', 'IQD', 'YER', 'SYP'
  ];

  constructor(amount: number, currency: string = 'USD') {
    this.validate(amount, currency);
    this.amount = this.roundToTwoDecimals(amount);
    this.currency = currency.toUpperCase();
  }

  private validate(amount: number, currency: string): void {
    if (amount === null || amount === undefined) {
      throw new Error('Amount is required');
    }

    if (typeof amount !== 'number' || isNaN(amount)) {
      throw new Error('Amount must be a valid number');
    }

    if (amount < 0) {
      throw new Error('Amount cannot be negative');
    }

    if (!currency || currency.trim().length === 0) {
      throw new Error('Currency is required');
    }

    const upperCurrency = currency.toUpperCase();
    if (!Money.VALID_CURRENCIES.includes(upperCurrency)) {
      throw new Error(`Invalid currency: ${currency}. Must be one of ${Money.VALID_CURRENCIES.join(', ')}`);
    }
  }

  private roundToTwoDecimals(value: number): number {
    return Math.round(value * 100) / 100;
  }

  getAmount(): number {
    return this.amount;
  }

  getCurrency(): string {
    return this.currency;
  }

  add(other: Money): Money {
    this.ensureSameCurrency(other);
    return new Money(this.amount + other.amount, this.currency);
  }

  subtract(other: Money): Money {
    this.ensureSameCurrency(other);
    const result = this.amount - other.amount;
    if (result < 0) {
      throw new Error('Subtraction would result in negative amount');
    }
    return new Money(result, this.currency);
  }

  multiply(factor: number): Money {
    if (factor < 0) {
      throw new Error('Factor cannot be negative');
    }
    return new Money(this.amount * factor, this.currency);
  }

  divide(divisor: number): Money {
    if (divisor <= 0) {
      throw new Error('Divisor must be positive');
    }
    return new Money(this.amount / divisor, this.currency);
  }

  isGreaterThan(other: Money): boolean {
    this.ensureSameCurrency(other);
    return this.amount > other.amount;
  }

  isLessThan(other: Money): boolean {
    this.ensureSameCurrency(other);
    return this.amount < other.amount;
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }

  private ensureSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error(`Cannot operate on different currencies: ${this.currency} and ${other.currency}`);
    }
  }

  toString(): string {
    return `${this.currency} ${this.amount.toFixed(2)}`;
  }

  toJSON(): { amount: number; currency: string } {
    return {
      amount: this.amount,
      currency: this.currency,
    };
  }

  static fromJSON(json: { amount: number; currency: string }): Money {
    return new Money(json.amount, json.currency);
  }

  static zero(currency: string = 'USD'): Money {
    return new Money(0, currency);
  }
}

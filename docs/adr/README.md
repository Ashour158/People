# Architecture Decision Records (ADR)

This directory contains Architecture Decision Records (ADRs) for the People HR Management System.

## What is an ADR?

An Architecture Decision Record (ADR) is a document that captures an important architectural decision made along with its context and consequences.

## Format

Each ADR follows this structure:

- **Title**: Short descriptive title
- **Status**: Proposed, Accepted, Deprecated, Superseded
- **Context**: What is the issue we're seeing that motivates this decision?
- **Decision**: What is the change we're proposing and/or doing?
- **Consequences**: What becomes easier or more difficult because of this change?

## Index

- [ADR-0001: Database Choice - PostgreSQL](./0001-database-choice.md)
- [ADR-0002: Authentication Strategy - JWT](./0002-authentication-strategy.md)
- [ADR-0003: Multi-tenant Architecture](./0003-multi-tenant-architecture.md)

## Creating a New ADR

When creating a new ADR:

1. Copy the template from `adr-template.md`
2. Name it with the next sequential number: `NNNN-title-with-dashes.md`
3. Fill in all sections
4. Get review from the team
5. Update this index

## Statuses

- **Proposed**: ADR is under discussion
- **Accepted**: Decision has been made and implemented
- **Deprecated**: No longer relevant but kept for historical context
- **Superseded**: Replaced by another ADR (reference the new one)

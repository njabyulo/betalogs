# Implementation Plan: Activity Event Processing

## Overview

This implementation plan converts the activity event processing design into discrete coding tasks that build the foundational event model for the Betalogs platform. The approach starts with core event structures and validation, then adds processing pipeline components, storage integration, and advanced features like correlation and tenant isolation.

## Tasks

- [ ] 1. Set up core event model and types
  - Create directory structure for activity event processing
  - Define TypeScript interfaces for RawEvent, CanonicalEvent, and processing types
  - Set up testing framework with fast-check for property-based testing
  - _Requirements: 1.1, 1.2, 1.3 (foundational)_

- [ ] 2. Implement event validation and normalization
  - [ ] 2.1 Create EventValidator class with category and field validation
    - Implement category validation for business, system, delivery, security events
    - Add required field validation and data type checking
    - _Requirements: 1.1, 1.2, 2.1, 3.1, 4.1, 5.1_

  - [ ]\* 2.2 Write property tests for event validation
    - **Property 1: Event Category Validation**
    - **Property 2: Core Field Validation**
    - **Validates: Requirements 1.1, 1.2, 2.1, 3.1, 4.1, 5.1**

  - [ ] 2.3 Create EventNormalizer class for canonical format conversion
    - Implement raw event to canonical event transformation
    - Add unique eventId generation and timestamp preservation
    - _Requirements: 1.3, 1.4, 1.5_

  - [ ]\* 2.4 Write property tests for normalization
    - **Property 3: Event Normalization Consistency**
    - **Property 4: Unique Event ID Assignment**
    - **Property 5: Timestamp Preservation**
    - **Validates: Requirements 1.3, 1.4, 1.5**

- [ ] 3. Add category-specific event processing
  - [ ] 3.1 Implement business event processing
    - Add support for business actions (checkout_started, payment_authorized, order_failed)
    - Implement actor and object data preservation for business events
    - Add outcome classification for business events
    - _Requirements: 2.2, 2.3, 2.4, 2.5_

  - [ ] 3.2 Implement system event processing
    - Add support for system actions (request_received, downstream_timeout, db_error)
    - Implement service information and correlation data preservation
    - Add error classification for system events
    - _Requirements: 3.2, 3.3, 3.4, 3.5_

  - [ ] 3.3 Implement delivery event processing
    - Add support for delivery actions (pr_merged, deploy_completed, rollback_initiated)
    - Implement GitHub information and deployment data preservation
    - Add evidence link creation for delivery events
    - _Requirements: 4.2, 4.3, 4.4, 4.5_

  - [ ] 3.4 Implement security event processing
    - Add support for security actions (permission_denied, role_changed, unauthorized_access)
    - Implement security actor data preservation and violation classification
    - Add sensitive data handling according to data minimization policies
    - _Requirements: 5.2, 5.3, 5.4, 5.5_

  - [ ]\* 3.5 Write property tests for category-specific processing
    - **Property 6: Category-Specific Action Support**
    - **Property 7: Data Field Preservation**
    - **Property 8: Outcome Classification**
    - **Validates: Requirements 2.2-2.5, 3.2-3.5, 4.2-4.5, 5.2-5.5**

- [ ] 4. Checkpoint - Ensure core event processing works
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement correlation engine
  - [ ] 5.1 Create CorrelationEngine class
    - Implement correlation data extraction from events
    - Add support for traceId, spanId, and business identifier correlation
    - Implement fallback correlation for events without trace context
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]\* 5.2 Write property tests for correlation
    - **Property 9: Correlation Data Preservation**
    - **Property 10: Fallback Correlation Support**
    - **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**

- [ ] 6. Add tenant isolation and security
  - [ ] 6.1 Create TenantSecurityService
    - Implement tenant validation and enforcement
    - Add tenant-based access controls and query filtering
    - Implement security violation detection and logging
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ]\* 6.2 Write property test for tenant isolation
    - **Property 11: Tenant Isolation Enforcement**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4**

  - [ ] 6.3 Implement audit logging
    - Add audit trail creation for all event processing operations
    - Include tenant context and operation details in audit logs
    - _Requirements: 7.5_

  - [ ]\* 6.4 Write property test for audit trails
    - **Property 12: Audit Trail Creation**
    - **Validates: Requirements 7.5**

- [ ] 7. Add error handling and resilience
  - [ ] 7.1 Implement validation error handling
    - Add descriptive error messages for invalid events
    - Implement size limit handling and truncation policies
    - _Requirements: 8.1, 8.2, 8.3_

  - [ ]\* 7.2 Write property tests for error handling
    - **Property 13: Validation Error Handling**
    - **Validates: Requirements 8.1, 8.2, 8.3**

  - [ ] 7.3 Add processing failure recovery
    - Implement dead letter queue routing for failed events
    - Add error logging and retry mechanisms
    - Implement sensitive data redaction policies
    - _Requirements: 8.4, 8.5_

  - [ ]\* 7.4 Write property tests for failure recovery
    - **Property 14: Processing Failure Recovery**
    - **Property 15: Sensitive Data Handling**
    - **Validates: Requirements 8.4, 8.5**

- [ ] 8. Implement event storage integration
  - [ ] 8.1 Create EventStore class with multi-storage support
    - Implement PostgreSQL storage for event metadata
    - Add OpenSearch integration for searchable event documents
    - Implement S3 archival for immutable event storage
    - _Requirements: 9.1, 9.3, 9.4_

  - [ ]\* 8.2 Write property tests for storage
    - **Property 16: Storage and Indexing**
    - **Property 17: Archival and Retention**
    - **Validates: Requirements 9.1, 9.3, 9.4, 9.5**

  - [ ] 8.3 Add batch processing support
    - Implement batch event processing for high-throughput scenarios
    - Add support for both real-time and batch processing patterns
    - _Requirements: 9.5_

- [ ] 9. Add serialization and transmission
  - [ ] 9.1 Implement event serialization
    - Add JSON and binary serialization support
    - Implement deserialization with format validation
    - Ensure round-trip consistency and data integrity preservation
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ]\* 9.2 Write property test for serialization
    - **Property 18: Serialization Round-Trip Consistency**
    - **Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5**

- [ ] 10. Create API controllers and pipeline integration
  - [ ] 10.1 Implement EventIngestController
    - Create Hono-based API controller for event ingestion
    - Add single event and batch event endpoints
    - Implement request validation and queue routing
    - _Requirements: All requirements (API layer)_

  - [ ] 10.2 Create EventProcessor Lambda function
    - Implement SQS-triggered event processing pipeline
    - Wire together validation, normalization, correlation, and storage
    - Add error handling and dead letter queue integration
    - _Requirements: All requirements (processing pipeline)_

  - [ ]\* 10.3 Write integration tests for API and pipeline
    - Test end-to-end event processing flows
    - Test error scenarios and recovery mechanisms
    - _Requirements: All requirements (integration)_

- [ ] 11. Final checkpoint and system integration
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties using fast-check
- Unit tests validate specific scenarios and integration points
- The implementation builds the foundational event model that other features depend on

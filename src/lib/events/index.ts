/**
 * Events module - handles event operations including recurrence
 */

export {
  expandRecurringEvent,
  expandRecurringEvents,
  isRecurringEvent,
  type ExpandedEventInstance,
  type DateRange,
} from './recurrence';

export {
  handleEventDrop,
  handleEventResize,
} from './handlers';

export {
  softDelete,
} from './delete';

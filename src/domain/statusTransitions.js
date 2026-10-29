const orderTransitions = {
  pending_confirmation: ['preparing', 'cancelled'],
  preparing: ['shipping', 'cancelled'],
  shipping: ['completed'],
  completed: [],
  cancelled: [],
};

const requestTransitions = {
  waiting_quote: ['quoted', 'rejected'],
  quoted: ['accepted', 'rejected'],
  accepted: [],
  rejected: [],
};

function canTransition(transitions, current, next) {
  return Object.hasOwn(transitions, current) && transitions[current].includes(next);
}

module.exports = { canTransition, orderTransitions, requestTransitions };

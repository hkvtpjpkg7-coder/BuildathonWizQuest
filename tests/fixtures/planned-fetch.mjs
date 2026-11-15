// Existing answer-validation tests need an explicit, valid planning stage.
// Keep its calls separate so assertions about teaching generation remain useful.
export function withInitialPlan(answerFetch) {
  return async (url, options) => {
    const messages = JSON.parse(options.body).messages;
    if (messages[0].content.startsWith('CONVERSATION_PLANNER') && !messages.some(turn => turn.role === 'assistant')) {
      return Response.json({ choices: [{ message: { content: JSON.stringify({
        intent: 'new_topic', query: messages.at(-1).content, reply: '', reuse_previous: false,
      }) } }] });
    }
    return answerFetch(url, options);
  };
}

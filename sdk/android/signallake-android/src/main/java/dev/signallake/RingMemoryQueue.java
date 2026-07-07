package dev.signallake;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.List;

final class RingMemoryQueue {
    private final ArrayDeque<EventEnvelope> items = new ArrayDeque<EventEnvelope>();
    private final SignalLakeQueuePolicy policy;

    RingMemoryQueue(SignalLakeQueuePolicy policy) {
        this.policy = Require.notNull(policy, "queuePolicy");
    }

    synchronized void enqueue(EventEnvelope event) {
        if (items.size() >= policy.maxEvents) {
            if (policy.dropPolicy == SignalLakeQueuePolicy.DropPolicy.DROP_NEWEST) {
                return;
            }
            items.removeFirst();
        }
        items.addLast(event);
    }

    synchronized List<EventEnvelope> drain(int limit) {
        int count = Math.min(Math.max(limit, 0), items.size());
        ArrayList<EventEnvelope> drained = new ArrayList<EventEnvelope>(count);
        for (int index = 0; index < count; index++) {
            drained.add(items.removeFirst());
        }
        return drained;
    }

    synchronized void restoreFront(List<EventEnvelope> events) {
        for (int index = events.size() - 1; index >= 0; index--) {
            while (items.size() >= policy.maxEvents) {
                items.removeLast();
            }
            items.addFirst(events.get(index));
        }
    }

    synchronized int size() {
        return items.size();
    }
}

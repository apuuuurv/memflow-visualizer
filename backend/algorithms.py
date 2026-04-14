def _serialize_step(
    page,
    frames,
    capacity,
    status,
    inserted_index=None,
    replaced_page=None,
    evicted_index=None,
    explanation=None,
    before_memory=None,
):
    memory_snapshot = frames + [None] * (capacity - len(frames))
    return {
        "page": page,
        "memory": memory_snapshot,
        "status": status,
        "insertedIndex": inserted_index,
        "replacedPage": replaced_page,
        "evictedIndex": evicted_index,
        "beforeMemory": before_memory,
        "explanation": explanation,
    }


def get_fifo_steps(pages, capacity):
    frames = []
    steps = []
    faults = 0
    pointer = 0
    entered_at = {}

    for step_number, page in enumerate(pages, start=1):
        status = "Hit"
        inserted_index = None
        replaced_page = None
        evicted_index = None
        explanation = None
        before_memory = None

        if page not in frames:
            status = "Miss"
            faults += 1
            before_memory = list(frames) + [None] * (capacity - len(frames))
            if len(frames) < capacity:
                frames.append(page)
                inserted_index = len(frames) - 1
                entered_at[page] = step_number
                explanation = f"Page {page} was loaded into an empty frame."
            else:
                inserted_index = pointer
                evicted_index = pointer
                replaced_page = frames[pointer]
                frames[pointer] = page
                explanation = (
                    f"Page {replaced_page} was evicted because it entered memory at step "
                    f"T{entered_at[replaced_page]} and FIFO removes the oldest resident page."
                )
                entered_at.pop(replaced_page, None)
                entered_at[page] = step_number
                pointer = (pointer + 1) % capacity

        steps.append(
            _serialize_step(
                page,
                list(frames),
                capacity,
                status,
                inserted_index,
                replaced_page,
                evicted_index,
                explanation,
                before_memory,
            )
        )

    return steps, faults


def get_lru_steps(pages, capacity):
    frames = []
    steps = []
    faults = 0
    last_used = {}

    for index, page in enumerate(pages):
        step_number = index + 1
        status = "Hit"
        inserted_index = None
        replaced_page = None
        evicted_index = None
        explanation = None
        before_memory = None

        if page not in frames:
            status = "Miss"
            faults += 1
            before_memory = list(frames) + [None] * (capacity - len(frames))
            if len(frames) < capacity:
                frames.append(page)
                inserted_index = len(frames) - 1
                explanation = f"Page {page} was loaded into an empty frame."
            else:
                lru_page = min(frames, key=lambda item: last_used[item])
                inserted_index = frames.index(lru_page)
                evicted_index = inserted_index
                replaced_page = lru_page
                explanation = (
                    f"Page {lru_page} was evicted because it was last used in step "
                    f"T{last_used[lru_page] + 1} (Least Recently Used)."
                )
                frames[inserted_index] = page

        last_used[page] = index
        steps.append(
            _serialize_step(
                page,
                list(frames),
                capacity,
                status,
                inserted_index,
                replaced_page,
                evicted_index,
                explanation,
                before_memory,
            )
        )

    return steps, faults


def get_optimal_steps(pages, capacity):
    frames = []
    steps = []
    faults = 0

    for index, page in enumerate(pages):
        status = "Hit"
        inserted_index = None
        replaced_page = None
        evicted_index = None
        explanation = None
        before_memory = None

        if page not in frames:
            status = "Miss"
            faults += 1
            before_memory = list(frames) + [None] * (capacity - len(frames))
            if len(frames) < capacity:
                frames.append(page)
                inserted_index = len(frames) - 1
                explanation = f"Page {page} was loaded into an empty frame."
            else:
                future_pages = pages[index + 1 :]
                farthest_use = -1
                next_use_label = "never used again"

                for frame_index, frame_page in enumerate(frames):
                    if frame_page not in future_pages:
                        inserted_index = frame_index
                        evicted_index = frame_index
                        replaced_page = frame_page
                        next_use_label = "it is never used again"
                        break

                    next_use = future_pages.index(frame_page)
                    if next_use > farthest_use:
                        farthest_use = next_use
                        inserted_index = frame_index
                        evicted_index = frame_index
                        replaced_page = frame_page
                        next_use_label = f"it is not used until T{index + next_use + 2}"

                frames[inserted_index] = page
                explanation = (
                    f"Page {replaced_page} was evicted because {next_use_label} "
                    f"(Farthest in the Future)."
                )

        steps.append(
            _serialize_step(
                page,
                list(frames),
                capacity,
                status,
                inserted_index,
                replaced_page,
                evicted_index,
                explanation,
                before_memory,
            )
        )

    return steps, faults


def calculate_metrics(faults, total_pages):
    if total_pages == 0:
        return 0, 0

    hit_ratio = ((total_pages - faults) / total_pages) * 100
    fault_ratio = (faults / total_pages) * 100
    return round(hit_ratio, 2), round(fault_ratio, 2)

import { useEffect, useState } from 'react'
import { fetchReaction, setReaction } from '../api/client'

export type ContentReaction = 'like' | 'dislike' | null

export function useContentReactions(contentId: string | null | undefined) {
  const [reaction, setReactionState] = useState<ContentReaction>(null)
  const [reactionLoading, setReactionLoading] = useState(false)
  const [reactionError, setReactionError] = useState<string | null>(null)

  useEffect(() => {
    if (!contentId) {
      setReactionState(null)
      return
    }

    fetchReaction(contentId)
      .then(({ reaction: value }) => setReactionState(value))
      .catch(() => setReactionState(null))
  }, [contentId])

  const handleReaction = async (next: ContentReaction) => {
    if (!contentId || reactionLoading) return
    const value = reaction === next ? null : next
    const previous = reaction
    setReactionLoading(true)
    setReactionError(null)
    setReactionState(value)

    try {
      const result = await setReaction(contentId, value)
      setReactionState(result.reaction)
    } catch (error) {
      setReactionState(previous)
      setReactionError(
        error instanceof Error ? error.message : 'Tepki kaydedilemedi. Tekrar deneyin.',
      )
    } finally {
      setReactionLoading(false)
    }
  }

  return {
    reaction,
    reactionLoading,
    reactionError,
    clearReactionError: () => setReactionError(null),
    handleReaction,
  }
}

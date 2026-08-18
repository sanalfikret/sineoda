import { useEffect, useState } from 'react'
import { fetchReaction, setReaction } from '../api/client'

export type ContentReaction = 'like' | 'dislike' | null

export function useContentReactions(contentId: string | null | undefined) {
  const [reaction, setReactionState] = useState<ContentReaction>(null)
  const [reactionLoading, setReactionLoading] = useState(false)

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
    setReactionLoading(true)
    try {
      const result = await setReaction(contentId, value)
      setReactionState(result.reaction)
    } catch {
      // Giriş veya profil yoksa sessizce geç
    } finally {
      setReactionLoading(false)
    }
  }

  return {
    reaction,
    reactionLoading,
    handleReaction,
  }
}

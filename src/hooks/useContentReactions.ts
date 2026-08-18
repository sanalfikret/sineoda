import { useEffect, useState } from 'react'
import { fetchReaction, setReaction } from '../api/client'
import { shareContent } from '../utils/share'

export type ContentReaction = 'like' | 'dislike' | null

export function useContentReactions(contentId: string | null | undefined) {
  const [reaction, setReactionState] = useState<ContentReaction>(null)
  const [reactionLoading, setReactionLoading] = useState(false)
  const [shareBusy, setShareBusy] = useState(false)

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

  const handleShare = async (title: string) => {
    if (!contentId || shareBusy) return
    setShareBusy(true)
    try {
      await shareContent(title, contentId)
    } finally {
      setShareBusy(false)
    }
  }

  return {
    reaction,
    reactionLoading,
    shareBusy,
    handleReaction,
    handleShare,
  }
}

/** Covers response body parsing as well as the initial network request. */
export async function withRequestDeadline<T>(run: (signal: AbortSignal) => Promise<T>, message: string, milliseconds = 20000): Promise<T> {
  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      run(controller.signal),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => { reject(new Error(message)); controller.abort() }, milliseconds)
      }),
    ])
  } finally { if (timer !== undefined) clearTimeout(timer) }
}

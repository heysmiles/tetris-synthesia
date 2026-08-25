import { useEffect, useSyncExternalStore } from 'react'
import { store } from './model/store'
import { TitleScreen, CreditsScreen } from './ui/TitleScreen'
import { GameScreen } from './ui/GameScreen'

export default function App() {
  useSyncExternalStore(store.subscribe, store.getVersion)

  useEffect(() => {
    store.loadSaved()
  }, [])

  const { screen } = store.state
  return (
    <div className="app">
      {screen === 'title' && <TitleScreen />}
      {screen === 'credits' && <CreditsScreen />}
      {screen === 'jam' && <GameScreen />}
    </div>
  )
}

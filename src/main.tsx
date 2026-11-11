import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './store'
import { restoreSession } from './store/thunks'
import './index.css'
import App from './App.tsx'

// Ada sesi tersimpan → muat data awal dari API (App menampilkan splash sementara).
if (store.getState().auth.status === 'restoring') void store.dispatch(restoreSession())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
)

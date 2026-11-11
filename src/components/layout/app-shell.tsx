import { useEffect, useRef } from 'react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { selectRoute } from '@/store/selectors'
import { uiActions } from '@/store/slices/uiSlice'
import { useMediaQuery } from '@/hooks/use-media-query'
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet'
import { Header } from './header'
import { Sidebar, SidebarContent } from './sidebar'
import { UploadProvider } from '@/components/drive/upload-provider'
import { HomeView } from '@/components/drive/home-view'
import { FolderView } from '@/components/drive/folder-view'
import { RecentView, SearchResults } from '@/components/drive/search-results'
import { DetailsPanelContent } from '@/components/drive/details-panel'
import { ActivityPage } from '@/components/activity/activity-page'
import { TrashPage } from '@/components/trash/trash-page'
import { UsersPage } from '@/components/admin/users-page'
import { DialogHost } from '@/components/dialogs/dialog-host'

const XL_QUERY = '(min-width: 1280px)'

const PAGE_TITLE: Record<string, string> = {
  home: 'Semua Workspace',
  recent: 'Terbaru',
  activity: 'Log Aktivitas',
  trash: 'Sampah',
  users: 'Pengguna & Peran',
}

export function AppShell() {
  const dispatch = useAppDispatch()
  const route = useAppSelector(selectRoute)
  const search = useAppSelector((s) => s.ui.search)
  const detailsOpen = useAppSelector((s) => s.ui.detailsOpen)
  const mobileNavOpen = useAppSelector((s) => s.ui.mobileNavOpen)
  const folderName = useAppSelector((s) => (route.page === 'folder' ? s.drive.nodes[route.id]?.name : undefined))
  const isXl = useMediaQuery(XL_QUERY)
  const scrollRef = useRef<HTMLDivElement>(null)

  const searching = !!search.trim()
  const detailsAvailable = !searching && (route.page === 'folder' || route.page === 'home')
  const showDetails = detailsOpen && detailsAvailable

  // Reset scroll & judul tab saat berpindah halaman
  const routeKey = route.page === 'folder' ? `f:${route.id}` : route.page
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 })
    // Di layar kecil panel detail berupa sheet penuh → jangan ikut terbuka saat pindah halaman
    if (!window.matchMedia(XL_QUERY).matches) dispatch(uiActions.setDetailsOpen(false))
  }, [routeKey, dispatch])
  useEffect(() => {
    const title = searching ? `Cari “${search.trim()}”` : (folderName ?? PAGE_TITLE[route.page] ?? '')
    document.title = `${title} — Varnion Space`
  }, [route.page, folderName, searching, search])

  let content
  if (searching) content = <SearchResults query={search} />
  else if (route.page === 'home') content = <HomeView />
  else if (route.page === 'folder') content = <FolderView folderId={route.id} />
  else if (route.page === 'recent') content = <RecentView />
  else if (route.page === 'activity') content = <ActivityPage />
  else if (route.page === 'trash') content = <TrashPage />
  else content = <UsersPage />

  const closeDetails = () => dispatch(uiActions.setDetailsOpen(false))

  return (
    <UploadProvider>
      <div className="flex h-dvh flex-col bg-shell text-foreground">
        <Header />
        <div className="flex min-h-0 flex-1">
          <Sidebar />
          <main className="flex min-w-0 flex-1 overflow-hidden rounded-t-2xl bg-background shadow-xs ring-1 ring-border/60 lg:mr-3 lg:mb-3 lg:rounded-2xl">
            <div ref={scrollRef} data-vt-clip className="min-w-0 flex-1 overflow-y-auto">
              {content}
            </div>
            {showDetails && isXl && (
              <aside className="w-80 shrink-0 border-l bg-background animate-in fade-in-0 slide-in-from-right-4 duration-200">
                <DetailsPanelContent onClose={closeDetails} />
              </aside>
            )}
          </main>
        </div>

        {/* Navigasi mobile */}
        <Sheet open={mobileNavOpen} onOpenChange={(o) => dispatch(uiActions.setMobileNavOpen(o))}>
          <SheetContent side="left" className="w-72 bg-shell p-0 pt-5">
            <SheetTitle className="sr-only">Navigasi</SheetTitle>
            <SheetDescription className="sr-only">Menu utama dan struktur workspace</SheetDescription>
            <SidebarContent enableTransitions={false} />
          </SheetContent>
        </Sheet>

        {/* Panel detail untuk layar < xl */}
        <Sheet open={showDetails && !isXl} onOpenChange={(o) => !o && closeDetails()}>
          <SheetContent side="right" className="w-full p-0 sm:max-w-sm" showCloseButton={false}>
            <SheetTitle className="sr-only">Detail & aktivitas</SheetTitle>
            <SheetDescription className="sr-only">Informasi item dan riwayat aktivitas</SheetDescription>
            <DetailsPanelContent onClose={closeDetails} />
          </SheetContent>
        </Sheet>

        <DialogHost />
      </div>
    </UploadProvider>
  )
}

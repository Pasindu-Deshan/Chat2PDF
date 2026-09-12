import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  AppBar,
  Box,
  Chip,
  Container,
  Dialog,
  IconButton,
  Snackbar,
  Stack,
  Tab,
  Tabs,
  ThemeProvider,
  Toolbar,
  Typography,
  CssBaseline,
  useMediaQuery,
  TextField,
  Switch,
  FormControlLabel,
} from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import ChatRoundedIcon from '@mui/icons-material/ChatRounded';

import { getAppTheme } from './theme';
import { parseWhatsAppChat } from './parser/whatsappParser';
import type { ChatMessage, ChatPageGroup, GeneratedPage } from './types/chat';
import type { Participant } from './types/participant';
import type { ChatSettings, SettingsPreset } from './types/settings';
import {
  DEFAULT_SETTINGS,
  SETTINGS_PRESETS,
  loadPersistedPrefs,
  persistPrefs,
} from './state/settingsState';
import { defaultColorForIndex } from './utils/colorUtils';
import { autoTextColor } from './utils/contrastUtils';
import { readFileAsText, downloadDataUrl, downloadBlob } from './utils/fileUtils';
import { slugifyFilename } from './utils/formatUtils';
import { buildDateGroups } from './utils/splitUtils';
import { paginateGroupByHeight, renderPageToDataUrl } from './pdf/imageGenerator';
import { buildPdf } from './pdf/pdfGenerator';

import { FileUploader } from './components/FileUploader/FileUploader';
import { ChatPreview } from './components/ChatPreview/ChatPreview';
import { ParticipantSettings } from './components/ParticipantSettings/ParticipantSettings';
import { BackgroundSettings } from './components/BackgroundSettings/BackgroundSettings';
import { TypographySettingsPanel } from './components/TypographySettings/TypographySettings';
import { ExportSettings } from './components/ExportSettings/ExportSettings';
import { GeneratedPages } from './components/GeneratedPages/GeneratedPages';
import { ChatStatistics } from './components/ChatStatistics/ChatStatistics';

type EditorTab = 'customize' | 'preview' | 'export';

function buildParticipants(parsed: { participants: string[]; messages: ChatMessage[] }): Participant[] {
  return parsed.participants.map((name, i) => {
    const color = defaultColorForIndex(i);
    const count = parsed.messages.filter((m) => m.sender === name).length;
    return {
      id: `p-${i}`,
      name,
      bubbleColor: color,
      textColor: autoTextColor(color),
      textColorMode: 'auto',
      messageCount: count,
    };
  });
}

export default function App() {
  const persisted = useMemo(() => loadPersistedPrefs(), []);
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(persisted?.themeMode ?? 'light');
  const theme = useMemo(() => getAppTheme(themeMode), [themeMode]);
  const isMobile = useMediaQuery('(max-width:900px)');

  const [settings, setSettings] = useState<ChatSettings>(() => ({
    ...DEFAULT_SETTINGS,
    output: { ...DEFAULT_SETTINGS.output, ...(persisted?.output ?? {}) },
    typography: { ...DEFAULT_SETTINGS.typography, ...(persisted?.typography ?? {}) },
    bubble: { ...DEFAULT_SETTINGS.bubble, ...(persisted?.bubble ?? {}) },
  }));

  // PDF settings describe the export container (paper size, margins), not
  // the chat's own visual config, so they're tracked separately from
  // ChatSettings.
  const [pdfSettings, setPdfSettings] = useState({
    pageSize: 'image' as const,
    orientation: 'portrait' as const,
    marginPx: 0,
    customWidthMm: 100,
    customHeightMm: 150,
  });

  useEffect(() => {
    persistPrefs({
      themeMode,
      output: settings.output,
      typography: settings.typography,
      bubble: settings.bubble,
    });
  }, [themeMode, settings.output, settings.typography, settings.bubble]);

  const [fileMeta, setFileMeta] = useState<{ name: string; size: number } | null>(null);
  const [parseResult, setParseResult] = useState<ReturnType<typeof parseWhatsAppChat> | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const [generatedPages, setGeneratedPages] = useState<GeneratedPage[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isBuildingPdf, setIsBuildingPdf] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [previewPageId, setPreviewPageId] = useState<string | null>(null);
  const [tab, setTab] = useState<EditorTab>('customize');

  const previewRef = useRef<HTMLDivElement>(null);

  const updateSettings = useCallback((patch: Partial<ChatSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleFileSelected = useCallback(async (file: File) => {
    setIsParsing(true);
    setParseError(null);
    setGeneratedPages([]);
    try {
      const text = await readFileAsText(file);
      const result = parseWhatsAppChat(text);
      if (result.messages.length === 0) {
        setParseError(
          "We couldn't find any WhatsApp-style messages in this file. Please make sure you uploaded a WhatsApp chat export (.txt)."
        );
        setIsParsing(false);
        return;
      }
      setFileMeta({ name: file.name, size: file.size });
      setParseResult(result);
      const newParticipants = buildParticipants(result);
      setParticipants(newParticipants);
      setSettings((prev) => ({
        ...prev,
        rightSideParticipantId: newParticipants[0]?.id ?? null,
        split: { ...prev.split, range: { start: result.firstDate, end: result.lastDate } },
      }));
      if (result.warnings.length > 0) {
        setToast(
          `Parsed ${result.messages.length} messages, but ${result.warnings.length} line(s) could not be interpreted.`
        );
      }
    } catch (err) {
      setParseError('Something went wrong reading this file. Please try again with a valid .txt export.');
    } finally {
      setIsParsing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateParticipant = useCallback((id: string, patch: Partial<Participant>) => {
    setParticipants((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const dateGroups = useMemo(() => {
    if (!parseResult) return [];
    return buildDateGroups(parseResult.messages, settings.split);
  }, [parseResult, settings.split]);

  const totalMessageCount = useMemo(
    () => dateGroups.reduce((sum, g) => sum + g.messages.length, 0),
    [dateGroups]
  );

  const handleGenerateImages = useCallback(async () => {
    if (!parseResult || dateGroups.length === 0) return;
    setIsGenerating(true);
    setGeneratedPages([]);

    try {
      const allPaginated: ChatPageGroup[] = [];
      for (const group of dateGroups) {
        // eslint-disable-next-line no-await-in-loop
        const paginated = await paginateGroupByHeight(group, participants, settings);
        allPaginated.push(...paginated);
      }

      const initialPages: GeneratedPage[] = allPaginated.map((group) => ({
        id: group.id,
        group,
        dataUrl: null,
        status: 'pending',
      }));
      setGeneratedPages(initialPages);

      for (let i = 0; i < allPaginated.length; i += 1) {
        const group = allPaginated[i];
        setGeneratedPages((prev) =>
          prev.map((p) => (p.id === group.id ? { ...p, status: 'rendering' } : p))
        );
        try {
          // eslint-disable-next-line no-await-in-loop
          const dataUrl = await renderPageToDataUrl(group, participants, settings);
          setGeneratedPages((prev) =>
            prev.map((p) => (p.id === group.id ? { ...p, status: 'done', dataUrl } : p))
          );
        } catch (err) {
          setGeneratedPages((prev) =>
            prev.map((p) =>
              p.id === group.id ? { ...p, status: 'error', error: 'Rendering failed' } : p
            )
          );
        }
      }
      setToast(`Generated ${allPaginated.length} page(s).`);
      if (isMobile) setTab('export');
    } finally {
      setIsGenerating(false);
    }
  }, [parseResult, dateGroups, participants, settings, isMobile]);

  const handleRegeneratePage = useCallback(
    async (id: string) => {
      const target = generatedPages.find((p) => p.id === id);
      if (!target) return;
      setGeneratedPages((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'rendering' } : p)));
      try {
        const dataUrl = await renderPageToDataUrl(target.group, participants, settings);
        setGeneratedPages((prev) =>
          prev.map((p) => (p.id === id ? { ...p, status: 'done', dataUrl } : p))
        );
      } catch {
        setGeneratedPages((prev) =>
          prev.map((p) => (p.id === id ? { ...p, status: 'error', error: 'Rendering failed' } : p))
        );
      }
    },
    [generatedPages, participants, settings]
  );

  const handleDeletePage = useCallback((id: string) => {
    setGeneratedPages((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const handleDownloadPng = useCallback(
    (id: string) => {
      const page = generatedPages.find((p) => p.id === id);
      if (!page?.dataUrl) return;
      downloadDataUrl(page.dataUrl, `${slugifyFilename(page.group.label)}.png`);
    },
    [generatedPages]
  );

  const handleDownloadAllPng = useCallback(() => {
    generatedPages.forEach((page, i) => {
      if (!page.dataUrl) return;
      setTimeout(() => downloadDataUrl(page.dataUrl as string, `${slugifyFilename(page.group.label)}-${i + 1}.png`), i * 200);
    });
  }, [generatedPages]);

  const handleDownloadPdf = useCallback(async () => {
    setIsBuildingPdf(true);
    try {
      const blob = await buildPdf(generatedPages, pdfSettings);
      downloadBlob(blob, `${slugifyFilename(fileMeta?.name.replace(/\.txt$/i, '') ?? 'chat')}.pdf`);
    } catch (err) {
      setToast(err instanceof Error ? err.message : 'Failed to build PDF.');
    } finally {
      setIsBuildingPdf(false);
    }
  }, [generatedPages, pdfSettings, fileMeta]);

  const previewMessages = useMemo(() => {
    if (!parseResult) return [];
    return dateGroups.length > 0 ? dateGroups[0].messages : parseResult.messages.slice(0, 40);
  }, [parseResult, dateGroups]);

  const previewPage = generatedPages.find((p) => p.id === previewPageId) ?? null;

  const hasChat = !!parseResult && parseResult.messages.length > 0;

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AppBar position="sticky" color="default" elevation={0} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
        <Toolbar sx={{ gap: 1 }}>
          <ChatRoundedIcon color="primary" />
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 800 }}>
            Chat2PDF
          </Typography>
          <Chip
            icon={<LockRoundedIcon fontSize="small" />}
            label="Runs locally in your browser"
            size="small"
            color="success"
            variant="outlined"
            sx={{ display: { xs: 'none', sm: 'flex' } }}
          />
          <IconButton onClick={() => setThemeMode((m) => (m === 'light' ? 'dark' : 'light'))}>
            {themeMode === 'light' ? <DarkModeRoundedIcon /> : <LightModeRoundedIcon />}
          </IconButton>
        </Toolbar>
      </AppBar>

      {!hasChat ? (
        <Container maxWidth="sm" sx={{ py: { xs: 6, sm: 10 } }}>
          <Stack spacing={3} alignItems="center" textAlign="center">
            <Typography variant="h3" sx={{ fontSize: { xs: 30, sm: 40 } }}>
              Convert WhatsApp chats into screenshot-style PDFs
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 480 }}>
              Upload your exported chat, customize the conversation, split it into date-based
              pages, and export a high-quality PDF — all without leaving your browser.
            </Typography>
            <Box sx={{ width: '100%' }}>
              <FileUploader
                onFileSelected={handleFileSelected}
                isParsing={isParsing}
                error={parseError}
                currentFileName={fileMeta?.name}
                currentFileSize={fileMeta?.size}
              />
            </Box>
          </Stack>
        </Container>
      ) : (
        <>
          {isMobile && (
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              variant="fullWidth"
              sx={{ borderBottom: '1px solid', borderColor: 'divider' }}
            >
              <Tab value="preview" label="Preview" />
              <Tab value="customize" label="Customize" />
              <Tab value="export" label="Export" />
            </Tabs>
          )}

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '360px 1fr' },
              minHeight: 'calc(100vh - 64px)',
            }}
          >
            {(!isMobile || tab === 'customize') && (
              <Box
                sx={{
                  borderRight: { md: '1px solid' },
                  borderColor: 'divider',
                  overflowY: 'auto',
                  maxHeight: { md: 'calc(100vh - 64px)' },
                  bgcolor: 'background.paper',
                }}
              >
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, pt: 2 }}>
                  <Typography variant="overline" color="text.secondary">
                    {fileMeta?.name}
                  </Typography>
                  <IconButton
                    size="small"
                    title="Start over with a new file"
                    onClick={() => {
                      setFileMeta(null);
                      setParseResult(null);
                      setParticipants([]);
                      setGeneratedPages([]);
                    }}
                  >
                    <RestartAltRoundedIcon fontSize="small" />
                  </IconButton>
                </Stack>

                <Stack direction="row" spacing={1} sx={{ px: 2, pb: 1, pt: 1, flexWrap: 'wrap', gap: 1 }}>
                  {(Object.keys(SETTINGS_PRESETS) as SettingsPreset[]).map((key) => (
                    <Chip
                      key={key}
                      size="small"
                      label={SETTINGS_PRESETS[key].label}
                      onClick={() => updateSettings(SETTINGS_PRESETS[key].apply(settings))}
                      variant="outlined"
                    />
                  ))}
                </Stack>

                <Accordion defaultExpanded disableGutters>
                  <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
                    <Typography variant="subtitle2">Participants &amp; alignment</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <ParticipantSettings
                      participants={participants}
                      rightSideParticipantId={settings.rightSideParticipantId}
                      onUpdateParticipant={updateParticipant}
                      onSetRightSide={(id) => updateSettings({ rightSideParticipantId: id })}
                    />
                  </AccordionDetails>
                </Accordion>

                <Accordion disableGutters>
                  <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
                    <Typography variant="subtitle2">Chat header</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Stack spacing={2}>
                      <FormControlLabel
                        control={
                          <Switch
                            checked={settings.header.show}
                            onChange={(e) =>
                              updateSettings({ header: { ...settings.header, show: e.target.checked } })
                            }
                          />
                        }
                        label="Show header"
                      />
                      <FormControlLabel
                        control={
                          <Switch
                            checked={settings.header.autoTitle}
                            onChange={(e) =>
                              updateSettings({ header: { ...settings.header, autoTitle: e.target.checked } })
                            }
                          />
                        }
                        label="Auto-generate title"
                      />
                      {!settings.header.autoTitle && (
                        <>
                          <TextField
                            size="small"
                            label="Title"
                            value={settings.header.title}
                            onChange={(e) =>
                              updateSettings({ header: { ...settings.header, title: e.target.value } })
                            }
                          />
                          <TextField
                            size="small"
                            label="Subtitle"
                            value={settings.header.subtitle}
                            onChange={(e) =>
                              updateSettings({ header: { ...settings.header, subtitle: e.target.value } })
                            }
                          />
                        </>
                      )}
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Typography variant="caption" color="text.secondary">
                          Header color
                        </Typography>
                        <Box
                          component="input"
                          type="color"
                          value={settings.header.backgroundColor}
                          onChange={(e) =>
                            updateSettings({
                              header: {
                                ...settings.header,
                                backgroundColor: (e.target as HTMLInputElement).value,
                              },
                            })
                          }
                          sx={{ width: 32, height: 24, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}
                        />
                      </Stack>
                    </Stack>
                  </AccordionDetails>
                </Accordion>

                <Accordion disableGutters>
                  <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
                    <Typography variant="subtitle2">Background</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <BackgroundSettings
                      background={settings.background}
                      onChange={(patch) => updateSettings({ background: { ...settings.background, ...patch } })}
                    />
                  </AccordionDetails>
                </Accordion>

                <Accordion disableGutters>
                  <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
                    <Typography variant="subtitle2">Typography &amp; message style</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <TypographySettingsPanel
                      typography={settings.typography}
                      bubble={settings.bubble}
                      showTimestamps={settings.showTimestamps}
                      showDateSeparators={settings.showDateSeparators}
                      onTypographyChange={(patch) =>
                        updateSettings({ typography: { ...settings.typography, ...patch } })
                      }
                      onBubbleChange={(patch) => updateSettings({ bubble: { ...settings.bubble, ...patch } })}
                      onToggleTimestamps={(v) => updateSettings({ showTimestamps: v })}
                      onToggleDateSeparators={(v) => updateSettings({ showDateSeparators: v })}
                    />
                  </AccordionDetails>
                </Accordion>

                <Accordion disableGutters>
                  <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />}>
                    <Typography variant="subtitle2">Chat information</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    {parseResult && <ChatStatistics parseResult={parseResult} participants={participants} />}
                  </AccordionDetails>
                </Accordion>
              </Box>
            )}

            {(!isMobile || tab === 'preview') && (
              <Box sx={{ p: { xs: 2, sm: 4 }, display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
                {parseResult && (
                  <Box sx={{ position: 'sticky', top: 16 }}>
                    <Typography variant="overline" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mb: 1 }}>
                      Live preview
                    </Typography>
                    <Box sx={{ maxWidth: 420 }}>
                      <ChatPreview
                        ref={previewRef}
                        messages={previewMessages}
                        participants={participants}
                        settings={settings}
                        width={420}
                      />
                    </Box>
                  </Box>
                )}
              </Box>
            )}

            {(!isMobile || tab === 'export') && (
              <Box
                sx={{
                  gridColumn: { md: '1 / -1' },
                  borderTop: { md: '1px solid' },
                  borderColor: 'divider',
                  p: { xs: 2, sm: 4 },
                }}
              >
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '360px 1fr' }, gap: 4 }}>
                  <ExportSettings
                    split={settings.split}
                    output={settings.output}
                    pdf={pdfSettings}
                    pageCount={dateGroups.length}
                    messageCount={totalMessageCount}
                    minDate={parseResult?.firstDate ?? null}
                    maxDate={parseResult?.lastDate ?? null}
                    isGenerating={isGenerating}
                    onSplitChange={(patch) => updateSettings({ split: { ...settings.split, ...patch } })}
                    onOutputChange={(patch) => updateSettings({ output: { ...settings.output, ...patch } })}
                    onPdfChange={(patch) => setPdfSettings((prev) => ({ ...prev, ...patch }))}
                    onGenerateImages={handleGenerateImages}
                  />
                  <GeneratedPages
                    pages={generatedPages}
                    onDelete={handleDeletePage}
                    onRegenerate={handleRegeneratePage}
                    onDownloadPng={handleDownloadPng}
                    onPreview={setPreviewPageId}
                    onDownloadAllPng={handleDownloadAllPng}
                    onDownloadPdf={handleDownloadPdf}
                    isBuildingPdf={isBuildingPdf}
                  />
                </Box>
              </Box>
            )}
          </Box>
        </>
      )}

      <Dialog open={!!previewPage} onClose={() => setPreviewPageId(null)} maxWidth="sm">
        <IconButton
          onClick={() => setPreviewPageId(null)}
          sx={{ position: 'absolute', right: 8, top: 8, bgcolor: 'background.paper' }}
          size="small"
        >
          <CloseRoundedIcon fontSize="small" />
        </IconButton>
        {previewPage?.dataUrl && (
          <Box component="img" src={previewPage.dataUrl} alt="Generated page preview" sx={{ width: '100%', display: 'block' }} />
        )}
      </Dialog>

      <Snackbar
        open={!!toast}
        autoHideDuration={5000}
        onClose={() => setToast(null)}
        message={toast}
      />
    </ThemeProvider>
  );
}

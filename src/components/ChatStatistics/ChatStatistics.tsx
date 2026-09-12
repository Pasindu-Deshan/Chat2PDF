import { Box, Divider, Stack, Typography } from '@mui/material';
import type { ParseResult } from '../../types/chat';
import type { Participant } from '../../types/participant';
import { daysBetweenIso, formatDateForDisplay } from '../../parser/dateUtils';
import { formatNumber, pluralize } from '../../utils/formatUtils';

interface ChatStatisticsProps {
  parseResult: ParseResult;
  participants: Participant[];
}

export function ChatStatistics({ parseResult, participants }: ChatStatisticsProps) {
  const realMessages = parseResult.messages.filter((m) => m.type === 'message');
  const durationDays =
    parseResult.firstDate && parseResult.lastDate
      ? daysBetweenIso(parseResult.firstDate, parseResult.lastDate) + 1
      : 0;
  const avgPerDay = durationDays > 0 ? (realMessages.length / durationDays).toFixed(1) : '0';
  const mostActive = [...participants].sort((a, b) => b.messageCount - a.messageCount)[0];

  return (
    <Stack spacing={1.5}>
      <StatRow label="Participants" value={formatNumber(participants.length)} />
      <StatRow label="Messages" value={formatNumber(realMessages.length)} />
      <StatRow
        label="First message"
        value={
          parseResult.firstDate
            ? formatDateForDisplay(parseResult.firstDate, { format: 'short', useRelativeLabels: false })
            : '—'
        }
      />
      <StatRow
        label="Last message"
        value={
          parseResult.lastDate
            ? formatDateForDisplay(parseResult.lastDate, { format: 'short', useRelativeLabels: false })
            : '—'
        }
      />
      <StatRow
        label="Chat duration"
        value={durationDays > 0 ? `${durationDays} ${pluralize(durationDays, 'day')}` : '—'}
      />
      <StatRow label="Avg. messages / day" value={avgPerDay} />
      {mostActive && <StatRow label="Most active" value={mostActive.name} />}
      {parseResult.warnings.length > 0 && (
        <StatRow label="Unparsed lines" value={formatNumber(parseResult.warnings.length)} />
      )}

      <Divider sx={{ my: 0.5 }} />

      {participants.map((p) => (
        <Box key={p.id} sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="body2" noWrap sx={{ maxWidth: 160 }}>
            {p.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {formatNumber(p.messageCount)} {pluralize(p.messageCount, 'msg', 'msgs')}
          </Typography>
        </Box>
      ))}
    </Stack>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {value}
      </Typography>
    </Box>
  );
}

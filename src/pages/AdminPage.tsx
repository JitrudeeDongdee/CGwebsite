import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Alert from '@mui/material/Alert'
import { leadRepository } from '../leads/localStorageRepository'
import { LEAD_STATUSES, type Lead, type LeadStatus } from '../leads/types'
import { formatCurrency } from '../pricing/estimate'

const STATUS_LABEL_KEYS: Record<LeadStatus, string> = {
  new: 'admin.statusNew',
  contacted: 'admin.statusContacted',
  won: 'admin.statusWon',
  lost: 'admin.statusLost',
}

export function AdminPage() {
  const { t, i18n } = useTranslation()
  const [leads, setLeads] = useState<Lead[]>([])
  const locale = i18n.resolvedLanguage === 'th' ? 'th-TH' : 'en-US'

  useEffect(() => {
    void leadRepository.list().then(setLeads)
  }, [])

  const changeStatus = async (id: string, status: LeadStatus) => {
    await leadRepository.updateStatus(id, status)
    setLeads(await leadRepository.list())
  }

  return (
    <Box sx={{ p: 3, overflowY: 'auto', flexGrow: 1 }}>
      <Stack spacing={2}>
        <Typography variant="h2">{t('admin.title')}</Typography>

        <Alert severity="info" variant="outlined">
          {t('admin.storageNotice')}
        </Alert>

        {leads.length === 0 ? (
          <Paper elevation={0} sx={{ p: 4, border: 1, borderColor: 'divider', textAlign: 'center' }}>
            <Typography variant="body1">{t('admin.empty')}</Typography>
            <Typography variant="body2" color="text.secondary">
              {t('admin.emptyHint')}
            </Typography>
          </Paper>
        ) : (
          <TableContainer component={Paper} elevation={0} sx={{ border: 1, borderColor: 'divider' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>{t('admin.createdAt')}</TableCell>
                  <TableCell>{t('admin.name')}</TableCell>
                  <TableCell>{t('admin.contact')}</TableCell>
                  <TableCell>{t('admin.province')}</TableCell>
                  <TableCell align="right">{t('admin.area')}</TableCell>
                  <TableCell align="right">{t('admin.estimate')}</TableCell>
                  <TableCell>{t('admin.status')}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {leads.map((lead) => (
                  <TableRow key={lead.id} hover>
                    <TableCell>
                      {new Date(lead.createdAt).toLocaleDateString(locale, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </TableCell>
                    <TableCell>{lead.contact.name}</TableCell>
                    <TableCell>
                      <Typography variant="body2">{lead.contact.phone}</Typography>
                      {lead.contact.email && (
                        <Typography variant="caption" color="text.secondary">
                          {lead.contact.email}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>{lead.contact.province}</TableCell>
                    <TableCell align="right">
                      {lead.estimate
                        ? `${lead.estimate.areaSqm.toFixed(2)} ${t('summary.squareMeters')}`
                        : '—'}
                    </TableCell>
                    <TableCell align="right">
                      {lead.estimate
                        ? formatCurrency(lead.estimate.total, lead.estimate.currency, locale)
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Select
                        size="small"
                        value={lead.status}
                        onChange={(e) => void changeStatus(lead.id, e.target.value as LeadStatus)}
                        variant="standard"
                      >
                        {LEAD_STATUSES.map((status) => (
                          <MenuItem key={status} value={status}>
                            {t(STATUS_LABEL_KEYS[status])}
                          </MenuItem>
                        ))}
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Stack>
    </Box>
  )
}

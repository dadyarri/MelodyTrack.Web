import { Box, Typography, Button, Stack } from '@mui/material'
import { useNavigate } from 'react-router-dom'

const NotFound = () => {
  const navigate = useNavigate()

  return (
    <Stack spacing={3} alignItems="center" justifyContent="center" sx={{ minHeight: '60vh' }}>
      <Box textAlign="center">
        <Typography variant="h3" component="h1" gutterBottom>
          404
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Page not found
        </Typography>
        <Button variant="contained" onClick={() => navigate('/')}>
          Go Home
        </Button>
      </Box>
    </Stack>
  )
}

export default NotFound 
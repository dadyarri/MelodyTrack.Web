import { Box, Typography, Button, Stack } from '@mui/material'
import { useNavigate } from 'react-router-dom'

const Home = () => {
  const navigate = useNavigate()

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h2" component="h1" gutterBottom>
          {import.meta.env.VITE_APP_NAME}
        </Typography>
        <Typography variant="h6" color="text.secondary">
          
        </Typography>
      </Box>
    </Stack>
  )
}

export default Home 
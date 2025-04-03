import { Box, Typography, Grid } from '@mui/material'
import ExpensesCard from '../components/ExpensesCard'

const Home = () => {
  return (
    <Box>
      <Typography variant="h2" component="h1" gutterBottom>
        Добро пожаловать в MelodyTrack
      </Typography>
      
      <Grid container spacing={3}>
        <Grid size={{xs:12, md:4}}>
          <ExpensesCard />
        </Grid>
      </Grid>
    </Box>
  )
}

export default Home 
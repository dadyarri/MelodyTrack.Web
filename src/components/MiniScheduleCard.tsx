import {Box, Card, CardContent, Divider, List, ListItem, ListItemText, Typography} from "@mui/material";
import {useEffect, useState} from "react";
import React from "react";
import {scheduleService} from "../services/serviceHistory.ts";
import {GetMiniScheduleResponse} from "../types/serviceHistory.ts";
import {format} from "date-fns";

const MiniScheduleCard = () => {
    const [data, setData] = useState<GetMiniScheduleResponse>();

    useEffect(() => {
        scheduleService.getMiniSchedule(Intl.DateTimeFormat().resolvedOptions().timeZone)
            .then((res) => setData(res))
    }, []);
    return (
        <Card sx={{height: '100%'}}>
            <CardContent>
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 2,
                    }}
                >
                    <Typography variant="h6">Мини-расписание</Typography>
                </Box>

                {data && Object.keys(data.items).length > 0 ? (
                    <List dense sx={{maxHeight: 300, overflowY: 'auto'}}>
                        {Object.entries(data.items).map(([groupName, items], index) => (
                            <React.Fragment key={groupName}>
                                {index > 0 && <Divider component="li" sx={{my: 1}}/>} {/* Divider between groups */}
                                <ListItem sx={{py: 0.5}}>
                                    <ListItemText
                                        primary={
                                            <Typography variant="subtitle1" color="text.secondary">
                                                {groupName}
                                            </Typography>
                                        }
                                    />
                                </ListItem>
                                {items.length > 0 ? (
                                    items.map((item, itemIndex) => (
                                        <ListItem key={`${groupName}-${itemIndex}`} sx={{pl: 4, py: 0.5}}
                                                  secondaryAction={
                                                      <Typography>{format(item.time, "HH:mm")}</Typography>}>
                                            <ListItemText
                                                primary={item.name}
                                                secondary={item.service}
                                            />
                                        </ListItem>
                                    ))
                                ) : (
                                    <ListItem sx={{pl: 4, py: 0.5}}>
                                        <ListItemText secondary="Нет записей"/>
                                    </ListItem>
                                )}
                            </React.Fragment>
                        ))}
                    </List>
                ) : (
                    <Typography variant="body2" color="text.secondary" sx={{mt: 2}}>
                        Нет занятий в ближайшие дни
                    </Typography>
                )}
            </CardContent>
        </Card>
    );
}

export default MiniScheduleCard;
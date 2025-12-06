# JSON Structure Documentation

Generated: 2025-12-05T21:32:29.577Z

---

## Summary

Top-level properties: 11

| Property | Type | Description |
|----------|------|-------------|
| `players` | array | Array with 10-10 items |
| `team_sessions` | array | Array with 14-14 items |
| `highlights` | array | Array with 20-20 items |
| `rallies` | array | Array with 21-21 items |
| `confidences` | object |  |
| `bounce_heatmap` | array | Array with 20-20 items |
| `ball_positions` | array | Array with 8212-8212 items |
| `player_positions` | object |  |
| `ball_bounces` | array | Array with 126-126 items |
| `thumbnail_crops` | object |  |
| `debug_data` | object |  |

---

## Full Property Hierarchy

### ``

| Path | Type(s) | Sample Values |
|------|---------|---------------|
| `` | object |  |

### `players`

| Path | Type(s) | Sample Values |
|------|---------|---------------|
| `players[]` | object |  |
| `players[].player_id` | integer | `244`, `236`, `222` |
| `players[].swings[]` | object |  |
| `players[].swings[].start` | object |  |
| `players[].swings[].start.timestamp` | float \| integer | `29.23301`, `75.33301`, `131.93301` |
| `players[].swings[].start.frame_nr` | integer | `877`, `2260`, `3958` |
| `players[].swings[].end` | object |  |
| `players[].swings[].end.timestamp` | float \| integer | `29.7`, `75.83301`, `132.39999` |
| `players[].swings[].end.frame_nr` | integer | `891`, `2275`, `3972` |
| `players[].swings[].player_id` | integer | `244`, `236`, `222` |
| `players[].swings[].swing_type` | string | `"other"`, `"forehand"`, `"backhand_one_hand"` |
| `players[].swings[].volley` | boolean | `false`, `true` |
| `players[].swings[].serve` | boolean | `false`, `true` |
| `players[].swings[].valid` | boolean | `true`, `false` |
| `players[].swings[].is_in_rally` | boolean | `true`, `false` |
| `players[].swings[].rally` | array \| null | length: 2-2, items: float, integer |
| `players[].swings[].confidence` | float | `0.99839`, `0.97323`, `0.96376` |
| `players[].swings[].confidence_swing_type` | float | `0.99518`, `0.96764`, `0.97461` |
| `players[].swings[].ball_hit` | object |  |
| `players[].swings[].ball_hit.timestamp` | float \| integer | `29.46699`, `75.6`, `132.16699` |
| `players[].swings[].ball_hit.frame_nr` | integer | `884`, `2268`, `3965` |
| `players[].swings[].ball_hit_location` | array \| null | length: 2-2, items: float |
| `players[].swings[].ball_player_distance` | float \| integer \| null | `0.07721953026172355`, `0.3015347888117749`, `0.039954844870252276` |
| `players[].swings[].ball_speed` | float \| null | `79.85`, `51.1`, `81.386` |
| `players[].swings[].ball_impact_location` | null |  |
| `players[].swings[].ball_impact_type` | null |  |
| `players[].swings[].intercepting_player_id` | null |  |
| `players[].swings[].ball_trajectory` | null |  |
| `players[].swings[].annotations[]` | object |  |
| `players[].swings[].annotations[].tracking_id` | integer | `244`, `236`, `222` |
| `players[].swings[].annotations[].keypoints[]` | array | length: 2-2, items: float, integer |
| `players[].swings[].annotations[].keypoints` | array | length: 17-17, items: array<float>, array<integer | float> |
| `players[].swings[].annotations[].confidences` | array | length: 17-17, items: float, integer |
| `players[].swings[].annotations[].meta` | object |  |
| `players[].swings[].annotations[].bbox` | array | length: 4-4, items: float, integer |
| `players[].swings[].annotations[].box_confidence` | integer | `1` |
| `players[].swings[].annotations[].annotation_format` | string | `"MOVENET"` |
| `players[].swings[].annotations` | array | length: 7-20, items: object, null |
| `players[].swings` | array | length: 0-51, items: object |
| `players[].swing_type_distribution` | object |  |
| `players[].swing_type_distribution.other` | float | `0.091`, `0.04`, `0.021` |
| `players[].swing_type_distribution.forehand` | float | `0.273`, `0.4`, `0.468` |
| `players[].swing_type_distribution.backhand_one_hand` | float \| integer | `0.205`, `0.32`, `0.298` |
| `players[].swing_type_distribution.lob` | float \| integer | `0.295`, `0.16`, `0.064` |
| `players[].swing_type_distribution.overhead` | float | `0.136`, `0.08`, `0.149` |
| `players[].swing_count` | integer | `44`, `25`, `47` |
| `players[].covered_distance` | float \| integer | `420.94397`, `236.2733`, `348.16507` |
| `players[].fastest_sprint` | float \| integer | `18.15235`, `12.16174`, `12.60545` |
| `players[].fastest_sprint_timestamp` | float \| null | `588.09998`, `114.6`, `459.29999` |
| `players[].activity_score` | float \| integer | `416.85365`, `233.31671`, `343.68946` |
| `players[].location_heatmap[]` | array | length: 500-500, items: float, integer |
| `players[].location_heatmap` | array \| null | length: 250-250, items: array<float>, array<integer>, array<integer | float> |
| `players[].swing_type_distribution.backhand_two_hand` | float | `0.029` |
| `players` | array | length: 10-10, items: object |

### `team_sessions`

| Path | Type(s) | Sample Values |
|------|---------|---------------|
| `team_sessions[]` | object |  |
| `team_sessions[].start_time` | integer \| float | `5`, `158`, `179` |
| `team_sessions[].end_time` | float \| integer | `134.86699`, `170`, `237` |
| `team_sessions[].team_front` | array | length: 0-2, items: integer |
| `team_sessions[].team_back` | array | length: 1-2, items: integer |
| `team_sessions[].players[]` | object |  |
| `team_sessions[].players[].player_id` | integer | `244`, `236`, `252` |
| `team_sessions[].players[].swings` | array | length: 0-0, items:  |
| `team_sessions[].players[].swing_type_distribution` | object |  |
| `team_sessions[].players[].swing_count` | integer | `3`, `11`, `6` |
| `team_sessions[].players[].covered_distance` | float | `101.3486`, `102.9145`, `76.22819` |
| `team_sessions[].players[].fastest_sprint` | float | `12.45712`, `12.16174`, `10.58177` |
| `team_sessions[].players[].fastest_sprint_timestamp` | float \| integer | `75.1`, `114.6`, `130.89999` |
| `team_sessions[].players[].activity_score` | float | `101.0433`, `103.19239`, `76.2717` |
| `team_sessions[].players[].location_heatmap` | null |  |
| `team_sessions[].players` | array | length: 2-4, items: object |
| `team_sessions` | array | length: 14-14, items: object |

### `highlights`

| Path | Type(s) | Sample Values |
|------|---------|---------------|
| `highlights[]` | object |  |
| `highlights[].type` | string | `"longest_rally"`, `"fastest_rally"` |
| `highlights[].start` | object |  |
| `highlights[].start.timestamp` | float \| integer | `533.66699`, `182.56699`, `214.93301` |
| `highlights[].start.frame_nr` | integer | `16010`, `5477`, `6448` |
| `highlights[].end` | object |  |
| `highlights[].end.timestamp` | float | `556.90002`, `203.06699`, `233.467` |
| `highlights[].end.frame_nr` | integer | `16707`, `6092`, `7004` |
| `highlights[].players[]` | object |  |
| `highlights[].players[].player_id` | integer | `244`, `222`, `252` |
| `highlights[].players[].swings[]` | object |  |
| `highlights[].players[].swings[].start` | object |  |
| `highlights[].players[].swings[].start.timestamp` | float \| integer | `536.90002`, `540.76697`, `546.43298` |
| `highlights[].players[].swings[].start.frame_nr` | integer | `16107`, `16223`, `16393` |
| `highlights[].players[].swings[].end` | object |  |
| `highlights[].players[].swings[].end.timestamp` | float \| integer | `537.40002`, `541.26697`, `546.90002` |
| `highlights[].players[].swings[].end.frame_nr` | integer | `16122`, `16238`, `16407` |
| `highlights[].players[].swings[].player_id` | integer | `244`, `222`, `252` |
| `highlights[].players[].swings[].swing_type` | string | `"lob"`, `"overhead"`, `"forehand"` |
| `highlights[].players[].swings[].volley` | boolean | `false`, `true` |
| `highlights[].players[].swings[].serve` | boolean | `false`, `true` |
| `highlights[].players[].swings[].valid` | boolean | `true`, `false` |
| `highlights[].players[].swings[].is_in_rally` | boolean | `true` |
| `highlights[].players[].swings[].rally` | array | length: 2-2, items: float, integer |
| `highlights[].players[].swings[].confidence` | float | `0.99144`, `0.99161`, `0.79334` |
| `highlights[].players[].swings[].confidence_swing_type` | float | `0.97432`, `0.97484`, `0.98753` |
| `highlights[].players[].swings[].ball_hit` | object |  |
| `highlights[].players[].swings[].ball_hit.timestamp` | float \| integer | `537.16699`, `541`, `546.66699` |
| `highlights[].players[].swings[].ball_hit.frame_nr` | integer | `16115`, `16230`, `16400` |
| `highlights[].players[].swings[].ball_hit_location` | array | length: 2-2, items: float |
| `highlights[].players[].swings[].ball_player_distance` | float \| integer | `0.07281708266685961`, `0`, `0.022523970218008747` |
| `highlights[].players[].swings[].ball_speed` | null \| float | `47.746`, `76.429`, `79.469` |
| `highlights[].players[].swings[].ball_impact_location` | null |  |
| `highlights[].players[].swings[].ball_impact_type` | null |  |
| `highlights[].players[].swings[].intercepting_player_id` | null |  |
| `highlights[].players[].swings[].ball_trajectory` | null |  |
| `highlights[].players[].swings[].annotations[]` | object |  |
| `highlights[].players[].swings[].annotations[].tracking_id` | integer | `244`, `222`, `252` |
| `highlights[].players[].swings[].annotations[].keypoints[]` | array | length: 2-2, items: float, integer |
| `highlights[].players[].swings[].annotations[].keypoints` | array | length: 17-17, items: array<float>, array<integer | float> |
| `highlights[].players[].swings[].annotations[].confidences` | array | length: 17-17, items: float, integer |
| `highlights[].players[].swings[].annotations[].meta` | object |  |
| `highlights[].players[].swings[].annotations[].bbox` | array | length: 4-4, items: float, integer |
| `highlights[].players[].swings[].annotations[].box_confidence` | integer | `1` |
| `highlights[].players[].swings[].annotations[].annotation_format` | string | `"MOVENET"` |
| `highlights[].players[].swings[].annotations` | array | length: 12-25, items: object, null |
| `highlights[].players[].swings` | array | length: 0-5, items: object |
| `highlights[].players[].swing_type_distribution` | object |  |
| `highlights[].players[].swing_type_distribution.lob` | float \| integer | `0.667`, `0.333`, `0.25` |
| `highlights[].players[].swing_type_distribution.overhead` | float \| integer | `0.333`, `0.6`, `1` |
| `highlights[].players[].swing_count` | integer | `3`, `5`, `1` |
| `highlights[].players[].covered_distance` | float | `20.44772`, `18.87759`, `13.07912` |
| `highlights[].players[].fastest_sprint` | float | `11.7095`, `10.56699`, `7.70236` |
| `highlights[].players[].fastest_sprint_timestamp` | float \| integer | `543.26697`, `534.40002`, `542.5` |
| `highlights[].players[].activity_score` | float | `22.58814`, `20.79106`, `14.02406` |
| `highlights[].players[].location_heatmap` | null |  |
| `highlights[].players[].swing_type_distribution.forehand` | float \| integer | `0.4`, `0.25`, `0.333` |
| `highlights[].players[].swing_type_distribution.other` | float | `0.333`, `0.25` |
| `highlights[].players` | array | length: 4-4, items: object |
| `highlights[].duration` | float | `23.23403`, `20.501`, `18.53499` |
| `highlights[].swing_count` | integer | `12`, `13`, `9` |
| `highlights[].ball_speed` | float | `0.43555`, `0.37337`, `0.46715` |
| `highlights[].ball_distance` | float | `10.11967`, `7.65456`, `8.65855` |
| `highlights[].players_speed` | float | `3.02829`, `3.48766`, `2.6782` |
| `highlights[].players_distance` | float | `70.35948`, `71.50052`, `49.64033` |
| `highlights[].dynamic_score` | float | `1633.83674`, `1208.55697`, `841.71655` |
| `highlights[].players[].swing_type_distribution.backhand_one_hand` | float \| integer | `0.25`, `0.333`, `1` |
| `highlights` | array | length: 20-20, items: object |

### `rallies`

| Path | Type(s) | Sample Values |
|------|---------|---------------|
| `rallies[]` | array | length: 2-2, items: float, integer |
| `rallies` | array | length: 21-21, items: array<float>, array<integer | float> |

### `confidences`

| Path | Type(s) | Sample Values |
|------|---------|---------------|
| `confidences` | object |  |
| `confidences.pose_confidences` | object |  |
| `confidences.pose_confidences.66` | object |  |
| `confidences.pose_confidences.66.mean` | float | `0.69982` |
| `confidences.pose_confidences.66.count` | integer | `229` |
| `confidences.pose_confidences.67` | object |  |
| `confidences.pose_confidences.67.mean` | float | `0.66456` |
| `confidences.pose_confidences.67.count` | integer | `58` |
| `confidences.pose_confidences.76` | object |  |
| `confidences.pose_confidences.76.mean` | float | `0.68834` |
| `confidences.pose_confidences.76.count` | integer | `3746` |
| `confidences.pose_confidences.205` | object |  |
| `confidences.pose_confidences.205.mean` | float | `0.63912` |
| `confidences.pose_confidences.205.count` | integer | `218` |
| `confidences.pose_confidences.210` | object |  |
| `confidences.pose_confidences.210.mean` | float | `0.55497` |
| `confidences.pose_confidences.210.count` | integer | `41` |
| `confidences.pose_confidences.212` | object |  |
| `confidences.pose_confidences.212.mean` | float | `0.57425` |
| `confidences.pose_confidences.212.count` | integer | `17` |
| `confidences.pose_confidences.222` | object |  |
| `confidences.pose_confidences.222.mean` | float | `0.67532` |
| `confidences.pose_confidences.222.count` | integer | `16564` |
| `confidences.pose_confidences.236` | object |  |
| `confidences.pose_confidences.236.mean` | float | `0.68074` |
| `confidences.pose_confidences.236.count` | integer | `10573` |
| `confidences.pose_confidences.244` | object |  |
| `confidences.pose_confidences.244.mean` | float | `0.70698` |
| `confidences.pose_confidences.244.count` | integer | `15368` |
| `confidences.pose_confidences.252` | object |  |
| `confidences.pose_confidences.252.mean` | float | `0.66359` |
| `confidences.pose_confidences.252.count` | integer | `14455` |
| `confidences.ball_confidences` | object |  |
| `confidences.ball_confidences.ball_detection_frequency` | integer | `0` |
| `confidences.ball_confidences.ball_detection_confidence` | float | `0.44064` |
| `confidences.swing_confidences` | object |  |
| `confidences.swing_confidences.67` | object |  |
| `confidences.swing_confidences.67.mean` | float | `0.9447` |
| `confidences.swing_confidences.67.ball_nearby` | integer | `1` |
| `confidences.swing_confidences.67.count` | integer | `1` |
| `confidences.swing_confidences.76` | object |  |
| `confidences.swing_confidences.76.mean` | float | `0.90518` |
| `confidences.swing_confidences.76.ball_nearby` | float | `0.9` |
| `confidences.swing_confidences.76.count` | integer | `10` |
| `confidences.swing_confidences.205` | object |  |
| `confidences.swing_confidences.205.mean` | float | `0.76306` |
| `confidences.swing_confidences.205.ball_nearby` | integer | `1` |
| `confidences.swing_confidences.205.count` | integer | `1` |
| `confidences.swing_confidences.222` | object |  |
| `confidences.swing_confidences.222.mean` | float | `0.85048` |
| `confidences.swing_confidences.222.ball_nearby` | float | `0.92157` |
| `confidences.swing_confidences.222.count` | integer | `51` |
| `confidences.swing_confidences.236` | object |  |
| `confidences.swing_confidences.236.mean` | float | `0.84349` |
| `confidences.swing_confidences.236.ball_nearby` | float | `0.9` |
| `confidences.swing_confidences.236.count` | integer | `30` |
| `confidences.swing_confidences.244` | object |  |
| `confidences.swing_confidences.244.mean` | float | `0.88912` |
| `confidences.swing_confidences.244.ball_nearby` | float | `0.97727` |
| `confidences.swing_confidences.244.count` | integer | `44` |
| `confidences.swing_confidences.252` | object |  |
| `confidences.swing_confidences.252.mean` | float | `0.87498` |
| `confidences.swing_confidences.252.ball_nearby` | float | `0.88372` |
| `confidences.swing_confidences.252.count` | integer | `43` |
| `confidences.final_confidences` | object |  |
| `confidences.final_confidences.pose` | float | `0.68207` |
| `confidences.final_confidences.swing` | float | `0.86769` |
| `confidences.final_confidences.swing_ball` | float | `0.92222` |
| `confidences.final_confidences.ball` | float | `0.44064` |
| `confidences.final_confidences.final` | float | `0.72816` |

### `bounce_heatmap`

| Path | Type(s) | Sample Values |
|------|---------|---------------|
| `bounce_heatmap[]` | array | length: 10-10, items: integer |
| `bounce_heatmap` | array | length: 20-20, items: array<integer> |

### `ball_positions`

| Path | Type(s) | Sample Values |
|------|---------|---------------|
| `ball_positions[]` | object |  |
| `ball_positions[].timestamp` | float \| integer | `3.1`, `3.2`, `3.23301` |
| `ball_positions[].X` | float | `0.43945`, `0.43164`, `0.43194` |
| `ball_positions[].Y` | float | `0.23958`, `0.23356`, `0.24132` |
| `ball_positions` | array | length: 8212-8212, items: object |

### `player_positions`

| Path | Type(s) | Sample Values |
|------|---------|---------------|
| `player_positions` | object |  |
| `player_positions.66[]` | object |  |
| `player_positions.66[].timestamp` | float | `471.733`, `471.9`, `472.067` |
| `player_positions.66[].X` | float | `0.0376`, `0.0509`, `0.0848` |
| `player_positions.66[].Y` | float | `0.8767`, `0.865`, `0.8547` |
| `player_positions.66[].court_X` | float | `1.179`, `1.2984`, `1.4179` |
| `player_positions.66[].court_Y` | float | `18.6201`, `18.627`, `18.6339` |
| `player_positions.66` | array | length: 46-46, items: object |
| `player_positions.67[]` | object |  |
| `player_positions.67[].timestamp` | float | `473.3`, `473.467`, `473.633` |
| `player_positions.67[].X` | float | `0.9667`, `0.9657`, `0.9668` |
| `player_positions.67[].Y` | float | `0.7478`, `0.6994`, `0.7159` |
| `player_positions.67[].court_X` | float | `8.5588`, `8.5508`, `8.5427` |
| `player_positions.67[].court_Y` | float | `18.7407`, `18.7478`, `18.7549` |
| `player_positions.67` | array | length: 12-12, items: object |
| `player_positions.76[]` | object |  |
| `player_positions.76[].timestamp` | float | `422.267`, `422.433`, `422.6` |
| `player_positions.76[].X` | float | `0.2536`, `0.255`, `0.2554` |
| `player_positions.76[].Y` | float | `0.3454`, `0.3541`, `0.3568` |
| `player_positions.76[].court_X` | float | `0.0944`, `0.1762`, `0.258` |
| `player_positions.76[].court_Y` | float | `10.6156`, `10.8804`, `11.1453` |
| `player_positions.76` | array | length: 750-750, items: object |
| `player_positions.205[]` | object |  |
| `player_positions.205[].timestamp` | float \| integer | `293.667`, `293.833`, `294` |
| `player_positions.205[].X` | float | `0.0552`, `0.0592`, `0.0619` |
| `player_positions.205[].Y` | float | `0.8542`, `0.8207`, `0.8185` |
| `player_positions.205[].court_X` | float | `1.3033`, `1.3002`, `1.2971` |
| `player_positions.205[].court_Y` | float | `18.6273`, `18.6268`, `18.6259` |
| `player_positions.205` | array | length: 44-44, items: object |
| `player_positions.210[]` | object |  |
| `player_positions.210[].timestamp` | float | `353.467`, `353.633`, `353.8` |
| `player_positions.210[].X` | float | `0.0487`, `0.0584`, `0.0719` |
| `player_positions.210[].Y` | float | `0.8797`, `0.8559`, `0.8469` |
| `player_positions.210[].court_X` | null |  |
| `player_positions.210[].court_Y` | null |  |
| `player_positions.210` | array | length: 9-9, items: object |
| `player_positions.212[]` | object |  |
| `player_positions.212[].timestamp` | float \| integer | `375.667`, `375.833`, `376` |
| `player_positions.212[].X` | float | `0.0656`, `0.0612`, `0.0566` |
| `player_positions.212[].Y` | float | `0.8183`, `0.8242`, `0.8746` |
| `player_positions.212[].court_X` | null |  |
| `player_positions.212[].court_Y` | null |  |
| `player_positions.212` | array | length: 4-4, items: object |
| `player_positions.222[]` | object |  |
| `player_positions.222[].timestamp` | float \| integer | `2.833`, `3`, `3.167` |
| `player_positions.222[].X` | float | `0.3914`, `0.3899`, `0.3889` |
| `player_positions.222[].Y` | float | `0.222`, `0.223`, `0.2237` |
| `player_positions.222[].court_X` | float | `1.6082`, `1.5471`, `1.486` |
| `player_positions.222[].court_Y` | float | `0.5849`, `0.5902`, `0.5955` |
| `player_positions.222` | array | length: 3313-3313, items: object |
| `player_positions.236[]` | object |  |
| `player_positions.236[].timestamp` | float | `1.467`, `1.633`, `1.8` |
| `player_positions.236[].X` | float | `0.2534`, `0.2583`, `0.2606` |
| `player_positions.236[].Y` | float | `0.3489`, `0.3513`, `0.3512` |
| `player_positions.236[].court_X` | float | `0.1537`, `0.245`, `0.3362` |
| `player_positions.236[].court_Y` | float | `10.636`, `10.8597`, `11.0833` |
| `player_positions.236` | array | length: 2115-2115, items: object |
| `player_positions.244[]` | object |  |
| `player_positions.244[].timestamp` | integer \| float | `0`, `0.167`, `0.333` |
| `player_positions.244[].X` | float | `0.5217`, `0.5242`, `0.5261` |
| `player_positions.244[].Y` | float | `0.4361`, `0.446`, `0.452` |
| `player_positions.244[].court_X` | float | `5.2249`, `5.2677`, `5.3104` |
| `player_positions.244[].court_Y` | float | `15.4068`, `15.4987`, `15.5905` |
| `player_positions.244` | array | length: 3074-3074, items: object |
| `player_positions.252[]` | object |  |
| `player_positions.252[].timestamp` | float | `2.867`, `3.067`, `3.233` |
| `player_positions.252[].X` | float | `0.4171`, `0.4201`, `0.4237` |
| `player_positions.252[].Y` | float | `0.2188`, `0.2194`, `0.2224` |
| `player_positions.252[].court_X` | float | `2.4446`, `2.6034`, `2.7621` |
| `player_positions.252[].court_Y` | float | `-0.0256`, `0.1178`, `0.2612` |
| `player_positions.252` | array | length: 2891-2891, items: object |

### `ball_bounces`

| Path | Type(s) | Sample Values |
|------|---------|---------------|
| `ball_bounces[]` | object |  |
| `ball_bounces[].timestamp` | float \| integer | `25.2`, `26.3`, `27.26699` |
| `ball_bounces[].court_pos` | array | length: 2-2, items: float |
| `ball_bounces[].player_id` | integer | `236`, `244`, `252` |
| `ball_bounces[].type` | string | `"floor"`, `"swing"` |
| `ball_bounces[].frame_nr` | null |  |
| `ball_bounces[].image_pos` | array | length: 2-2, items: float |
| `ball_bounces` | array | length: 126-126, items: object |

### `thumbnail_crops`

| Path | Type(s) | Sample Values |
|------|---------|---------------|
| `thumbnail_crops` | object |  |
| `thumbnail_crops.66[]` | object |  |
| `thumbnail_crops.66[].bbox[]` | array | length: 4-4, items: float |
| `thumbnail_crops.66[].bbox` | array | length: 4-4, items: array<float> |
| `thumbnail_crops.66[].frame_nr` | integer | `761`, `756`, `759` |
| `thumbnail_crops.66[].timestamp` | float | `475.36700439453125`, `475.20001220703125`, `475.29998779296875` |
| `thumbnail_crops.66[].score` | float | `0.426318484020489`, `0.42258684016324133`, `0.4223715722971937` |
| `thumbnail_crops.66` | array | length: 5-5, items: object |
| `thumbnail_crops.67[]` | object |  |
| `thumbnail_crops.67[].bbox[]` | array | length: 4-4, items: float, integer |
| `thumbnail_crops.67[].bbox` | array | length: 4-4, items: array<float>, array<float | integer> |
| `thumbnail_crops.67[].frame_nr` | integer | `713`, `714`, `715` |
| `thumbnail_crops.67[].timestamp` | float | `473.7669982910156`, `473.79998779296875`, `473.8330078125` |
| `thumbnail_crops.67[].score` | float | `0.42925895794327484`, `0.42633535044295146`, `0.42612993938082155` |
| `thumbnail_crops.67` | array | length: 5-5, items: object |
| `thumbnail_crops.76[]` | object |  |
| `thumbnail_crops.76[].bbox[]` | array | length: 4-4, items: float |
| `thumbnail_crops.76[].bbox` | array | length: 4-4, items: array<float> |
| `thumbnail_crops.76[].frame_nr` | integer | `300`, `298`, `297` |
| `thumbnail_crops.76[].timestamp` | integer \| float | `550`, `549.9329833984375`, `549.9000244140625` |
| `thumbnail_crops.76[].score` | float | `0.5001275920240231`, `0.4961675579189613`, `0.4942494486916138` |
| `thumbnail_crops.76` | array | length: 5-5, items: object |
| `thumbnail_crops.205[]` | object |  |
| `thumbnail_crops.205[].bbox[]` | array | length: 4-4, items: float |
| `thumbnail_crops.205[].bbox` | array | length: 4-4, items: array<float> |
| `thumbnail_crops.205[].frame_nr` | integer | `846`, `848`, `855` |
| `thumbnail_crops.205[].timestamp` | float | `298.20001220703125`, `298.2669982910156`, `298.5` |
| `thumbnail_crops.205[].score` | float | `0.4358411355221082`, `0.4323892585946724`, `0.43146876694364444` |
| `thumbnail_crops.205` | array | length: 5-5, items: object |
| `thumbnail_crops.210[]` | object |  |
| `thumbnail_crops.210[].bbox[]` | array | length: 4-4, items: float, integer |
| `thumbnail_crops.210[].bbox` | array | length: 4-4, items: array<float>, array<integer | float> |
| `thumbnail_crops.210[].frame_nr` | integer | `711`, `710`, `740` |
| `thumbnail_crops.210[].timestamp` | float | `353.70001220703125`, `353.6669921875`, `354.6669921875` |
| `thumbnail_crops.210[].score` | float | `0.40875175962950505`, `0.4087264956426119`, `0.4041616068516173` |
| `thumbnail_crops.210` | array | length: 5-5, items: object |
| `thumbnail_crops.212[]` | object |  |
| `thumbnail_crops.212[].bbox[]` | array | length: 4-4, items: float |
| `thumbnail_crops.212[].bbox` | array | length: 4-4, items: array<float> |
| `thumbnail_crops.212[].frame_nr` | integer | `471`, `470` |
| `thumbnail_crops.212[].timestamp` | float | `375.70001220703125`, `375.6669921875` |
| `thumbnail_crops.212[].score` | float | `0.44404057039049816`, `0.4396008665714936` |
| `thumbnail_crops.212` | array | length: 2-2, items: object |
| `thumbnail_crops.222[]` | object |  |
| `thumbnail_crops.222[].bbox[]` | array | length: 4-4, items: float |
| `thumbnail_crops.222[].bbox` | array | length: 4-4, items: array<float> |
| `thumbnail_crops.222[].frame_nr` | integer | `329`, `328`, `226` |
| `thumbnail_crops.222[].timestamp` | float | `370.96697998046875`, `370.9330139160156`, `337.53302001953125` |
| `thumbnail_crops.222[].score` | float | `0.4664910812455443`, `0.4595111244981598`, `0.4574660606996641` |
| `thumbnail_crops.222` | array | length: 5-5, items: object |
| `thumbnail_crops.236[]` | object |  |
| `thumbnail_crops.236[].bbox[]` | array | length: 4-4, items: float |
| `thumbnail_crops.236[].bbox` | array | length: 4-4, items: array<float> |
| `thumbnail_crops.236[].frame_nr` | integer | `625`, `626`, `623` |
| `thumbnail_crops.236[].timestamp` | float | `50.8330078125`, `50.86699295043945`, `50.766990661621094` |
| `thumbnail_crops.236[].score` | float | `0.49823803456150806`, `0.4921141725432474`, `0.4886978880118118` |
| `thumbnail_crops.236` | array | length: 5-5, items: object |
| `thumbnail_crops.244[]` | object |  |
| `thumbnail_crops.244[].bbox[]` | array | length: 4-4, items: float |
| `thumbnail_crops.244[].bbox` | array | length: 4-4, items: array<float> |
| `thumbnail_crops.244[].frame_nr` | integer | `349`, `357`, `586` |
| `thumbnail_crops.244[].timestamp` | float | `131.6330108642578`, `131.89999389648438`, `79.53300476074219` |
| `thumbnail_crops.244[].score` | float | `0.4938533462414463`, `0.4935941224096474`, `0.4934559898573394` |
| `thumbnail_crops.244` | array | length: 5-5, items: object |
| `thumbnail_crops.252[]` | object |  |
| `thumbnail_crops.252[].bbox[]` | array | length: 4-4, items: float |
| `thumbnail_crops.252[].bbox` | array | length: 4-4, items: array<float> |
| `thumbnail_crops.252[].frame_nr` | integer | `335`, `779`, `777` |
| `thumbnail_crops.252[].timestamp` | float | `221.1669921875`, `205.9669952392578`, `205.89999389648438` |
| `thumbnail_crops.252[].score` | float | `0.482615079798201`, `0.4812728499815331`, `0.4797090626850381` |
| `thumbnail_crops.252` | array | length: 5-5, items: object |

### `debug_data`

| Path | Type(s) | Sample Values |
|------|---------|---------------|
| `debug_data` | object |  |
| `debug_data.swings[]` | object |  |
| `debug_data.swings[].start` | object |  |
| `debug_data.swings[].start.timestamp` | float \| integer | `5.83301`, `17.36699`, `24.06699` |
| `debug_data.swings[].start.frame_nr` | integer | `175`, `521`, `722` |
| `debug_data.swings[].end` | object |  |
| `debug_data.swings[].end.timestamp` | float | `6.23301`, `17.86699`, `24.53301` |
| `debug_data.swings[].end.frame_nr` | integer | `187`, `536`, `736` |
| `debug_data.swings[].player_id` | integer | `252`, `222`, `236` |
| `debug_data.swings[].swing_type` | string | `"lob"`, `"forehand"`, `"backhand_one_hand"` |
| `debug_data.swings[].volley` | boolean | `false`, `true` |
| `debug_data.swings[].serve` | boolean | `false`, `true` |
| `debug_data.swings[].valid` | boolean | `false`, `true` |
| `debug_data.swings[].is_in_rally` | boolean | `false`, `true` |
| `debug_data.swings[].rally` | null \| array | length: 2-2, items: float |
| `debug_data.swings[].confidence` | float | `0.37772`, `0.89261`, `0.99183` |
| `debug_data.swings[].confidence_swing_type` | float | `0.52582`, `0.87023`, `0.97549` |
| `debug_data.swings[].ball_hit` | object |  |
| `debug_data.swings[].ball_hit.timestamp` | float | `6.03301`, `17.6`, `24.3` |
| `debug_data.swings[].ball_hit.frame_nr` | integer | `181`, `528`, `729` |
| `debug_data.swings[].ball_hit_location` | array | length: 2-2, items: float |
| `debug_data.swings[].ball_player_distance` | float \| integer \| null | `2.433910716035198`, `0`, `0.1727681518151828` |
| `debug_data.swings[].ball_speed` | null \| float | `71.188`, `70.043`, `59.431` |
| `debug_data.swings[].ball_impact_location` | null |  |
| `debug_data.swings[].ball_impact_type` | null |  |
| `debug_data.swings[].intercepting_player_id` | null |  |
| `debug_data.swings[].ball_trajectory` | null |  |
| `debug_data.swings[].annotations[]` | object |  |
| `debug_data.swings[].annotations[].tracking_id` | integer | `252`, `222`, `236` |
| `debug_data.swings[].annotations[].keypoints[]` | array | length: 2-2, items: float |
| `debug_data.swings[].annotations[].keypoints` | array | length: 17-17, items: array<float> |
| `debug_data.swings[].annotations[].confidences` | array | length: 17-17, items: float, integer |
| `debug_data.swings[].annotations[].meta` | object |  |
| `debug_data.swings[].annotations[].bbox` | array | length: 4-4, items: float, integer |
| `debug_data.swings[].annotations[].box_confidence` | integer | `1` |
| `debug_data.swings[].annotations[].annotation_format` | string | `"MOVENET"` |
| `debug_data.swings[].annotations` | array | length: 13-17, items: object, null |
| `debug_data.swings[].conf_ball_pos` | integer | `-1`, `1`, `0` |
| `debug_data.swings[].conf_ball_in` | integer \| float \| null | `0`, `1`, `0.38884374445686753` |
| `debug_data.swings[].conf_ball_out` | integer \| float \| null | `0`, `0.23042698273788512`, `1` |
| `debug_data.swings[].conf_ball_hit` | integer \| float \| null | `0`, `0.12664925750045747`, `0.4650909303109909` |
| `debug_data.swings[].conf_rbounce` | float \| integer | `0.2`, `1` |
| `debug_data.swings[].sconf_ypos` | float \| integer | `0.7`, `-1`, `0.24368392033588893` |
| `debug_data.swings[].sconf_dyn3` | float | `0.22117740614323145`, `0.17800175636661428`, `0.8895764645763945` |
| `debug_data.swings[].sconf_type` | integer \| float | `0`, `0.75`, `0.15` |
| `debug_data.swings[].sconf` | float | `0.24010751887468573`, `0.3957586402221905`, `0.8270160391372088` |
| `debug_data.swings[].vconf_ypos` | integer \| float | `0`, `0.4284894071539138`, `0.14737281897106547` |
| `debug_data.swings[].vconf_dur` | integer \| float | `0`, `0.6192785714285712`, `0.95215` |
| `debug_data.swings[].vconf_bounce` | integer | `0`, `1` |
| `debug_data.swings[].vconf_type` | integer \| float | `0`, `0.3`, `0.7` |
| `debug_data.swings[].vconf_orient` | float \| integer | `0.7`, `0` |
| `debug_data.swings[].vconf_serve` | float \| integer | `0.5`, `0` |
| `debug_data.swings[].weights` | object |  |
| `debug_data.swings[].weights.confidence_swing_type` | float | `1.2` |
| `debug_data.swings[].weights.conf_ball_pos` | integer | `1` |
| `debug_data.swings[].weights.conf_ball_in` | float | `0.1` |
| `debug_data.swings[].weights.conf_ball_out` | float | `0.3` |
| `debug_data.swings[].weights.conf_ball_hit` | integer | `0` |
| `debug_data.swings[].weights.conf_rbounce` | integer | `1` |
| `debug_data.swings[].weights.sconf_dyn3` | integer | `2` |
| `debug_data.swings[].weights.sconf_ypos` | float | `0.5` |
| `debug_data.swings[].weights.sconf_type` | float | `0.8` |
| `debug_data.swings[].weights.vconf_dur` | integer | `1` |
| `debug_data.swings[].weights.vconf_bounce` | integer | `0`, `1` |
| `debug_data.swings[].weights.vconf_serve` | integer | `0`, `3` |
| `debug_data.swings[].weights.vconf_orient` | float \| integer | `0.2`, `2` |
| `debug_data.swings[].weights.vconf_type` | integer \| float | `2`, `0.5`, `0` |
| `debug_data.swings[].info` | array | length: 1-5, items: string |
| `debug_data.swings` | array | length: 180-180, items: object |
| `debug_data.court_keypoints[]` | array | length: 2-2, items: float, null |
| `debug_data.court_keypoints` | array | length: 14-14, items: array<float>, array<null> |
| `debug_data.ball_bounces[]` | object |  |
| `debug_data.ball_bounces[].timestamp` | float | `3.4`, `3.86699`, `5.2` |
| `debug_data.ball_bounces[].court_pos` | array | length: 2-2, items: float, integer |
| `debug_data.ball_bounces[].player_id` | integer | `-1` |
| `debug_data.ball_bounces[].type` | string | `"floor"`, `"swing"`, `"other"` |
| `debug_data.ball_bounces` | array | length: 596-596, items: object |
| `debug_data.video_info` | object |  |
| `debug_data.video_info.width` | integer | `1920` |
| `debug_data.video_info.height` | integer | `1080` |
| `debug_data.video_info.fps` | integer | `30` |
| `debug_data.video_info.end_time` | float | `600.00033` |
| `debug_data.video_info.total_frames` | integer | `18000` |
| `debug_data.video_info.start_timestamp` | integer | `0` |

---

## Tree View

```
├─ : object
├─ ball_bounces: array [126-126 items]
├─ ball_bounces[]: object
  ├─ court_pos: array [2-2 items]
  ├─ frame_nr: null
  ├─ image_pos: array [2-2 items]
  ├─ player_id: integer
  ├─ timestamp: float | integer
  ├─ type: string
├─ ball_positions: array [8212-8212 items]
├─ ball_positions[]: object
  ├─ X: float
  ├─ Y: float
  ├─ timestamp: float | integer
├─ bounce_heatmap: array [20-20 items]
├─ bounce_heatmap[]: array [10-10 items]
├─ confidences: object
  ├─ ball_confidences: object
    ├─ ball_detection_confidence: float
    ├─ ball_detection_frequency: integer
  ├─ final_confidences: object
    ├─ ball: float
    ├─ final: float
    ├─ pose: float
    ├─ swing: float
    ├─ swing_ball: float
  ├─ pose_confidences: object
    ├─ 205: object
      ├─ count: integer
      ├─ mean: float
    ├─ 210: object
      ├─ count: integer
      ├─ mean: float
    ├─ 212: object
      ├─ count: integer
      ├─ mean: float
    ├─ 222: object
      ├─ count: integer
      ├─ mean: float
    ├─ 236: object
      ├─ count: integer
      ├─ mean: float
    ├─ 244: object
      ├─ count: integer
      ├─ mean: float
    ├─ 252: object
      ├─ count: integer
      ├─ mean: float
    ├─ 66: object
      ├─ count: integer
      ├─ mean: float
    ├─ 67: object
      ├─ count: integer
      ├─ mean: float
    ├─ 76: object
      ├─ count: integer
      ├─ mean: float
  ├─ swing_confidences: object
    ├─ 205: object
      ├─ ball_nearby: integer
      ├─ count: integer
      ├─ mean: float
    ├─ 222: object
      ├─ ball_nearby: float
      ├─ count: integer
      ├─ mean: float
    ├─ 236: object
      ├─ ball_nearby: float
      ├─ count: integer
      ├─ mean: float
    ├─ 244: object
      ├─ ball_nearby: float
      ├─ count: integer
      ├─ mean: float
    ├─ 252: object
      ├─ ball_nearby: float
      ├─ count: integer
      ├─ mean: float
    ├─ 67: object
      ├─ ball_nearby: integer
      ├─ count: integer
      ├─ mean: float
    ├─ 76: object
      ├─ ball_nearby: float
      ├─ count: integer
      ├─ mean: float
├─ debug_data: object
  ├─ ball_bounces: array [596-596 items]
  ├─ ball_bounces[]: object
    ├─ court_pos: array [2-2 items]
    ├─ player_id: integer
    ├─ timestamp: float
    ├─ type: string
  ├─ court_keypoints: array [14-14 items]
  ├─ court_keypoints[]: array [2-2 items]
  ├─ swings: array [180-180 items]
  ├─ swings[]: object
    ├─ annotations: array [13-17 items]
    ├─ annotations[]: object
      ├─ annotation_format: string
      ├─ bbox: array [4-4 items]
      ├─ box_confidence: integer
      ├─ confidences: array [17-17 items]
      ├─ keypoints: array [17-17 items]
      ├─ keypoints[]: array [2-2 items]
      ├─ meta: object
      ├─ tracking_id: integer
    ├─ ball_hit: object
      ├─ frame_nr: integer
      ├─ timestamp: float
    ├─ ball_hit_location: array [2-2 items]
    ├─ ball_impact_location: null
    ├─ ball_impact_type: null
    ├─ ball_player_distance: float | integer | null
    ├─ ball_speed: null | float
    ├─ ball_trajectory: null
    ├─ conf_ball_hit: integer | float | null
    ├─ conf_ball_in: integer | float | null
    ├─ conf_ball_out: integer | float | null
    ├─ conf_ball_pos: integer
    ├─ conf_rbounce: float | integer
    ├─ confidence: float
    ├─ confidence_swing_type: float
    ├─ end: object
      ├─ frame_nr: integer
      ├─ timestamp: float
    ├─ info: array [1-5 items]
    ├─ intercepting_player_id: null
    ├─ is_in_rally: boolean
    ├─ player_id: integer
    ├─ rally: null | array [2-2 items]
    ├─ sconf: float
    ├─ sconf_dyn3: float
    ├─ sconf_type: integer | float
    ├─ sconf_ypos: float | integer
    ├─ serve: boolean
    ├─ start: object
      ├─ frame_nr: integer
      ├─ timestamp: float | integer
    ├─ swing_type: string
    ├─ valid: boolean
    ├─ vconf_bounce: integer
    ├─ vconf_dur: integer | float
    ├─ vconf_orient: float | integer
    ├─ vconf_serve: float | integer
    ├─ vconf_type: integer | float
    ├─ vconf_ypos: integer | float
    ├─ volley: boolean
    ├─ weights: object
      ├─ conf_ball_hit: integer
      ├─ conf_ball_in: float
      ├─ conf_ball_out: float
      ├─ conf_ball_pos: integer
      ├─ conf_rbounce: integer
      ├─ confidence_swing_type: float
      ├─ sconf_dyn3: integer
      ├─ sconf_type: float
      ├─ sconf_ypos: float
      ├─ vconf_bounce: integer
      ├─ vconf_dur: integer
      ├─ vconf_orient: float | integer
      ├─ vconf_serve: integer
      ├─ vconf_type: integer | float
  ├─ video_info: object
    ├─ end_time: float
    ├─ fps: integer
    ├─ height: integer
    ├─ start_timestamp: integer
    ├─ total_frames: integer
    ├─ width: integer
├─ highlights: array [20-20 items]
├─ highlights[]: object
  ├─ ball_distance: float
  ├─ ball_speed: float
  ├─ duration: float
  ├─ dynamic_score: float
  ├─ end: object
    ├─ frame_nr: integer
    ├─ timestamp: float
  ├─ players: array [4-4 items]
  ├─ players[]: object
    ├─ activity_score: float
    ├─ covered_distance: float
    ├─ fastest_sprint: float
    ├─ fastest_sprint_timestamp: float | integer
    ├─ location_heatmap: null
    ├─ player_id: integer
    ├─ swing_count: integer
    ├─ swing_type_distribution: object
      ├─ backhand_one_hand: float | integer
      ├─ forehand: float | integer
      ├─ lob: float | integer
      ├─ other: float
      ├─ overhead: float | integer
    ├─ swings: array [0-5 items]
    ├─ swings[]: object
      ├─ annotations: array [12-25 items]
      ├─ annotations[]: object
        ├─ annotation_format: string
        ├─ bbox: array [4-4 items]
        ├─ box_confidence: integer
        ├─ confidences: array [17-17 items]
        ├─ keypoints: array [17-17 items]
        ├─ keypoints[]: array [2-2 items]
        ├─ meta: object
        ├─ tracking_id: integer
      ├─ ball_hit: object
        ├─ frame_nr: integer
        ├─ timestamp: float | integer
      ├─ ball_hit_location: array [2-2 items]
      ├─ ball_impact_location: null
      ├─ ball_impact_type: null
      ├─ ball_player_distance: float | integer
      ├─ ball_speed: null | float
      ├─ ball_trajectory: null
      ├─ confidence: float
      ├─ confidence_swing_type: float
      ├─ end: object
        ├─ frame_nr: integer
        ├─ timestamp: float | integer
      ├─ intercepting_player_id: null
      ├─ is_in_rally: boolean
      ├─ player_id: integer
      ├─ rally: array [2-2 items]
      ├─ serve: boolean
      ├─ start: object
        ├─ frame_nr: integer
        ├─ timestamp: float | integer
      ├─ swing_type: string
      ├─ valid: boolean
      ├─ volley: boolean
  ├─ players_distance: float
  ├─ players_speed: float
  ├─ start: object
    ├─ frame_nr: integer
    ├─ timestamp: float | integer
  ├─ swing_count: integer
  ├─ type: string
├─ player_positions: object
  ├─ 205: array [44-44 items]
  ├─ 205[]: object
    ├─ X: float
    ├─ Y: float
    ├─ court_X: float
    ├─ court_Y: float
    ├─ timestamp: float | integer
  ├─ 210: array [9-9 items]
  ├─ 210[]: object
    ├─ X: float
    ├─ Y: float
    ├─ court_X: null
    ├─ court_Y: null
    ├─ timestamp: float
  ├─ 212: array [4-4 items]
  ├─ 212[]: object
    ├─ X: float
    ├─ Y: float
    ├─ court_X: null
    ├─ court_Y: null
    ├─ timestamp: float | integer
  ├─ 222: array [3313-3313 items]
  ├─ 222[]: object
    ├─ X: float
    ├─ Y: float
    ├─ court_X: float
    ├─ court_Y: float
    ├─ timestamp: float | integer
  ├─ 236: array [2115-2115 items]
  ├─ 236[]: object
    ├─ X: float
    ├─ Y: float
    ├─ court_X: float
    ├─ court_Y: float
    ├─ timestamp: float
  ├─ 244: array [3074-3074 items]
  ├─ 244[]: object
    ├─ X: float
    ├─ Y: float
    ├─ court_X: float
    ├─ court_Y: float
    ├─ timestamp: integer | float
  ├─ 252: array [2891-2891 items]
  ├─ 252[]: object
    ├─ X: float
    ├─ Y: float
    ├─ court_X: float
    ├─ court_Y: float
    ├─ timestamp: float
  ├─ 66: array [46-46 items]
  ├─ 66[]: object
    ├─ X: float
    ├─ Y: float
    ├─ court_X: float
    ├─ court_Y: float
    ├─ timestamp: float
  ├─ 67: array [12-12 items]
  ├─ 67[]: object
    ├─ X: float
    ├─ Y: float
    ├─ court_X: float
    ├─ court_Y: float
    ├─ timestamp: float
  ├─ 76: array [750-750 items]
  ├─ 76[]: object
    ├─ X: float
    ├─ Y: float
    ├─ court_X: float
    ├─ court_Y: float
    ├─ timestamp: float
├─ players: array [10-10 items]
├─ players[]: object
  ├─ activity_score: float | integer
  ├─ covered_distance: float | integer
  ├─ fastest_sprint: float | integer
  ├─ fastest_sprint_timestamp: float | null
  ├─ location_heatmap: array | null [250-250 items]
  ├─ location_heatmap[]: array [500-500 items]
  ├─ player_id: integer
  ├─ swing_count: integer
  ├─ swing_type_distribution: object
    ├─ backhand_one_hand: float | integer
    ├─ backhand_two_hand: float
    ├─ forehand: float
    ├─ lob: float | integer
    ├─ other: float
    ├─ overhead: float
  ├─ swings: array [0-51 items]
  ├─ swings[]: object
    ├─ annotations: array [7-20 items]
    ├─ annotations[]: object
      ├─ annotation_format: string
      ├─ bbox: array [4-4 items]
      ├─ box_confidence: integer
      ├─ confidences: array [17-17 items]
      ├─ keypoints: array [17-17 items]
      ├─ keypoints[]: array [2-2 items]
      ├─ meta: object
      ├─ tracking_id: integer
    ├─ ball_hit: object
      ├─ frame_nr: integer
      ├─ timestamp: float | integer
    ├─ ball_hit_location: array | null [2-2 items]
    ├─ ball_impact_location: null
    ├─ ball_impact_type: null
    ├─ ball_player_distance: float | integer | null
    ├─ ball_speed: float | null
    ├─ ball_trajectory: null
    ├─ confidence: float
    ├─ confidence_swing_type: float
    ├─ end: object
      ├─ frame_nr: integer
      ├─ timestamp: float | integer
    ├─ intercepting_player_id: null
    ├─ is_in_rally: boolean
    ├─ player_id: integer
    ├─ rally: array | null [2-2 items]
    ├─ serve: boolean
    ├─ start: object
      ├─ frame_nr: integer
      ├─ timestamp: float | integer
    ├─ swing_type: string
    ├─ valid: boolean
    ├─ volley: boolean
├─ rallies: array [21-21 items]
├─ rallies[]: array [2-2 items]
├─ team_sessions: array [14-14 items]
├─ team_sessions[]: object
  ├─ end_time: float | integer
  ├─ players: array [2-4 items]
  ├─ players[]: object
    ├─ activity_score: float
    ├─ covered_distance: float
    ├─ fastest_sprint: float
    ├─ fastest_sprint_timestamp: float | integer
    ├─ location_heatmap: null
    ├─ player_id: integer
    ├─ swing_count: integer
    ├─ swing_type_distribution: object
    ├─ swings: array [0-0 items]
  ├─ start_time: integer | float
  ├─ team_back: array [1-2 items]
  ├─ team_front: array [0-2 items]
├─ thumbnail_crops: object
  ├─ 205: array [5-5 items]
  ├─ 205[]: object
    ├─ bbox: array [4-4 items]
    ├─ bbox[]: array [4-4 items]
    ├─ frame_nr: integer
    ├─ score: float
    ├─ timestamp: float
  ├─ 210: array [5-5 items]
  ├─ 210[]: object
    ├─ bbox: array [4-4 items]
    ├─ bbox[]: array [4-4 items]
    ├─ frame_nr: integer
    ├─ score: float
    ├─ timestamp: float
  ├─ 212: array [2-2 items]
  ├─ 212[]: object
    ├─ bbox: array [4-4 items]
    ├─ bbox[]: array [4-4 items]
    ├─ frame_nr: integer
    ├─ score: float
    ├─ timestamp: float
  ├─ 222: array [5-5 items]
  ├─ 222[]: object
    ├─ bbox: array [4-4 items]
    ├─ bbox[]: array [4-4 items]
    ├─ frame_nr: integer
    ├─ score: float
    ├─ timestamp: float
  ├─ 236: array [5-5 items]
  ├─ 236[]: object
    ├─ bbox: array [4-4 items]
    ├─ bbox[]: array [4-4 items]
    ├─ frame_nr: integer
    ├─ score: float
    ├─ timestamp: float
  ├─ 244: array [5-5 items]
  ├─ 244[]: object
    ├─ bbox: array [4-4 items]
    ├─ bbox[]: array [4-4 items]
    ├─ frame_nr: integer
    ├─ score: float
    ├─ timestamp: float
  ├─ 252: array [5-5 items]
  ├─ 252[]: object
    ├─ bbox: array [4-4 items]
    ├─ bbox[]: array [4-4 items]
    ├─ frame_nr: integer
    ├─ score: float
    ├─ timestamp: float
  ├─ 66: array [5-5 items]
  ├─ 66[]: object
    ├─ bbox: array [4-4 items]
    ├─ bbox[]: array [4-4 items]
    ├─ frame_nr: integer
    ├─ score: float
    ├─ timestamp: float
  ├─ 67: array [5-5 items]
  ├─ 67[]: object
    ├─ bbox: array [4-4 items]
    ├─ bbox[]: array [4-4 items]
    ├─ frame_nr: integer
    ├─ score: float
    ├─ timestamp: float
  ├─ 76: array [5-5 items]
  ├─ 76[]: object
    ├─ bbox: array [4-4 items]
    ├─ bbox[]: array [4-4 items]
    ├─ frame_nr: integer
    ├─ score: float
    ├─ timestamp: integer | float
```

import { IsIn, IsOptional } from 'class-validator';

export class UpdateUiPreferencesDto {
  @IsOptional()
  @IsIn(['operations-grid', 'split-pane-workbench', 'sectioned-workspace'])
  layoutPreset?: 'operations-grid' | 'split-pane-workbench' | 'sectioned-workspace';

  @IsOptional()
  @IsIn(['clean-blue', 'slate-teal', 'warm-neutral'])
  colorTheme?: 'clean-blue' | 'slate-teal' | 'warm-neutral';

  @IsOptional()
  @IsIn(['light', 'dark'])
  mode?: 'light' | 'dark';
}

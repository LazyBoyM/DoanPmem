import { useAcademic } from '../context/academic-context';
import { Badge } from './ui';

export default function RegistrationStatusBadge({ classInfo }) {
    const { registrationStatusFor } = useAcademic();
    const status = registrationStatusFor(classInfo);
    return <Badge variant={status.variant} size="sm">{status.label}</Badge>;
}

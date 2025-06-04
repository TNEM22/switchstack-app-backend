import Esp from '../models/espModel';
import User from '../models/userModel';
import Switch from '../models/switchModel';

async function verifyUser(id: string) {
  try {
    await User.findById(id);
    return true;
  } catch (e) {
    return false;
  }
}

async function updateDb(data: string) {
  try {
    const esp = data.split(':')[0];
    const sw: string | number = data.split(':')[1].split('?')[0];
    let state: string | boolean = data.split(':')[1].split('?')[1];
    if (sw != 'r') {
      if (state === '1') {
        state = true;
      } else {
        state = false;
      }
      const aesp = await Esp.findById(esp);
      if (aesp && Number(sw) <= aesp.switches.length) {
        await Switch.findByIdAndUpdate(aesp.switches[Number(sw)], {
          state: state,
        });
      }
    }
  } catch (e) {
    console.log(e);
  }
}

export default { verifyUser, updateDb };

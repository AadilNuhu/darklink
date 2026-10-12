import { ShieldAlert } from "lucide-react"
import { useState } from "react"
import GeneratedCode from "./GeneratedCode"

interface Modal { onClose: () => void }

const CreateRoom = ({ onClose }: Modal) => {
    const [success, setSuccess] = useState<string>("")
    const [error, setError] = useState<string>("")
    const [isSubmited, setIsSubmited] = useState<Boolean>(false)
    const [formData, setFormData] = useState({
        roomName: "",
        duration: "15",
        numUsers: "2",
        userhandle: ""
    })

    // Handle form submission
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        console.log("Form submitted with data:", formData)
        setSuccess("Successfully")
        setTimeout(() => {
            setIsSubmited(true)
        }, 3000);

    }

    // Handle input changes
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData(prev => ({
            ...prev,
            [name]: value
        }))
    }

    return (
        <div>
            {!isSubmited ? (
                <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm'>

                    {/* 2. Modal card container */}
                    <div className='relative w-full max-w-md p-6 transition-all transform bg-black border border-gray-600 rounded-2xl shadow-2xl'>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-[#00ff66] text-xs">// INITIALIZE_SESSION</h3>
                            <button className="cursor-pointer hover:text-red-600" onClick={onClose}>X</button>
                        </div>
                        <form action="" onSubmit={handleSubmit}>
                            {/* Form messages */}
                            {success && <div className="p-2 mb-4 text-xs text-green-500 bg-green-900/20 border border-green-500 rounded-md">{success}</div>}
                            {error && <div className="p-2 mb-4 text-xs text-red-500 bg-red-900/20 border border-red-500 rounded-md">{error}</div>}

                            {/* 1. Modal header */}
                            <h2 className="mb-1 text-lg font-bold text-white">Create a Room</h2>
                            <p className="mb-4 text-xs text-white/60">Fill in the details below to create a new room.</p>

                            {/* Name of chat */}
                            <label className="flex items-center gap-2 mb-1 text-xs text-white/80">
                                Room name
                            </label>
                            <input type="text" name="roomName" onChange={handleChange} placeholder="Anonym099" className="w-full p-2 mb-4 text-gray-300 border outline-none border-gray-600 focus:border-[#00ff66] rounded-md" />

                            <div className="flex gap-4">
                                {/* Duration */}
                                <div className="flex flex-col w-full">
                                    <label className="flex items-center gap-2 mb-1 text-xs text-white/80">
                                        Duration
                                    </label>
                                    <select name="duration" id="duration" onChange={handleChange} className="w-full p-2 mb-4 text-gray-300 border bg-black outline-none border-gray-600 focus:border-[#00ff66] rounded-md">
                                        <option value="15">15 minutes</option>
                                        <option value="30">30 minutes</option>
                                        <option value="60">1 hour</option>
                                    </select>
                                </div>

                                {/* Number of users */}
                                <div className="flex flex-col w-full">
                                    <label className="flex items-center gap-2 mb-1 text-xs text-white/80">
                                        Number of users
                                    </label>
                                    <input type="number" value={formData.numUsers} name="numUsers" onChange={handleChange} placeholder="min 2" min={2} className="w-full p-2 mb-4 text-gray-300 border outline-none border-gray-600 focus:border-[#00ff66] rounded-md" />
                                </div>

                            </div>
                            {/* Room Code which is auto-generated
                <label className="flex items-center gap-2 mb-1 text-xs text-white/80">
                    Room Code
                </label>
                <input type="text" placeholder="Room Code" className="w-full p-2 text-gray-300 border outline-none border-gray-600 focus:border-[#00ff66] rounded-md" />
                <label className="flex ml-2 items-center gap-2 text-xs text-white/60 mb-4">This is auto-generated and will be used to join the room</label> */}

                            {/* Your Handle */}
                            <label className="flex items-center gap-2 mb-1 text-xs text-white/80">
                                Your Handle
                            </label>
                            <input type="text" name="userhandle" onChange={handleChange} placeholder="user101" className="w-full p-2 mb-4 text-gray-300 border outline-none border-gray-600 focus:border-[#00ff66] rounded-md" />
                            <button className="w-full p-2 bg-[#00ff66] text-black font-bold rounded-md hover:bg-[#00cc52] cursor-pointer">Create</button>
                            {/* Security warning */}
                            <div className="flex items-center gap-2 mt-4 text-xs text-white/80">
                                <ShieldAlert className="text-yellow-500" />
                                <span>Creating a room will generate a unique code for others to join.</span>
                            </div>
                        </form>
                    </div>
                </div>
            ) : <GeneratedCode onClose={onClose} />}
        </div>

    )
}

export default CreateRoom